import { useEffect, useMemo, useState } from 'react';

import { incentives, Offer, Payment, Requirement } from '../../data/incentives';
import { trueLayercachedProviders, closedProviders } from '../../data/providers';
import { User } from 'src/types/Bagel';

import '../../styles/App.css';
import './IncentivesPage.css';
import { Tooltip, TooltipContent, TooltipTrigger } from '../common/Tooltip';
import { ToggleSwitch } from '../common/ToggleSwitch';
import { RadioButtons } from '../common/RadioButtons';

import EventRepeat from '../../assets/icons/EventRepeat.svg?react';
import MoneyBag from '../../assets/icons/MoneyBag.svg?react';

type SelectedTodos = Record<string, Record<string, { marks: string[], data?: Record<string, any> }>>;

type IncentivesPageProps = {
    users: User[];
};

function IncentivesPage({ users, }: IncentivesPageProps) {
    const offers = incentives.data ?? [];

    const selectedTodosStorageKey = 'bagel:selectedTodos:v1';

    const [selectedTodos, setSelectedTodos] = useState<SelectedTodos>(() => loadSelectedTodos());
    const [selectedOfferID, setSelectedOfferID] = useState<string | null>(null);
    const [showAllOffers, setShowExpired] = useState(false);
    const [sortBy, setSortBy] = useState<'value' | 'date'>('value');

    useEffect(() => {
        try {
            localStorage.setItem(selectedTodosStorageKey, JSON.stringify(selectedTodos));
        } catch {
            // ignore quota / privacy mode failures
        }
    }, [selectedTodos]);

    const selectedOffer = useMemo(
        () => offers.find((o: any) => o.id === selectedOfferID) ?? null,
        [offers, selectedOfferID]
    );

    const people = useMemo(() => {
        return [
            ...users,
            { id: 'joint', name: 'Joint Account', email: 'null', icon: './Serenity/Heart.png' },
        ]
    }, [users]);

    const allReqGroups = offers.map(offer => {
        const groups: ReqGroup[] = [
            {
                groupId: '',
                title: offer.title,
                reqs: offer.requirements ?? [],
                payment: offer.payment,
            },
            ...(offer.components ?? []).map((c: any, idx: number) => ({
                groupId: `${c.id ?? idx}`,
                title: c.title ?? c.name ?? `Component ${idx + 1}`,
                reqs: c.requirements ?? [],
                payment: c.payment,
            })),
        ].filter(g => g.reqs.length > 0);

        return {
            offerId: offer.id,
            offerTitle: offer.title,
            groups,
        };
    });

    function loadSelectedTodos(): SelectedTodos {
        try {
            const raw = localStorage.getItem(selectedTodosStorageKey);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            return (parsed && typeof parsed === 'object') ? (parsed as SelectedTodos) : {};
        } catch {
            return {};
        }
    }

    function toggleTodo(offerId: string, reqId: string, userId: string) {
        setSelectedTodos(prev => {
            const next: SelectedTodos = { ...prev };
            const offerMap = { ...(next[offerId] ?? {}) };
            const prevEntry = offerMap[reqId] ?? { marks: [] as string[] };
            const prevMarks = prevEntry.marks ?? [];

            const has = prevMarks.includes(userId);
            const nextMarks = has ? prevMarks.filter(x => x !== userId) : [...prevMarks, userId];

            if (nextMarks.length === 0) {
                delete offerMap[reqId];
            }
            else {
                offerMap[reqId] = { ...prevEntry, marks: nextMarks };
            }

            if (Object.keys(offerMap).length === 0) {
                delete next[offerId];
            }
            else {
                next[offerId] = offerMap;
            }

            return next;
        });
    }

    const offerGroupsIndex = new Map(
        allReqGroups.map(x => [x.offerId, x]) // { offerId, offerTitle, groups }
    );
    const offersById = new Map(offers.map(o => [o.id, o]));

    function renderMonolithTodos() {
        const activeOfferIds = Object.keys(selectedTodos);

        return (
            <div className="offerDetails" style={{ gap: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Your Progress</div>

                {activeOfferIds.length ? (
                    <div className="offerCard" style={{ gap: 12 }}>
                        {activeOfferIds.map((offerId) => {
                            const grouped = offerGroupsIndex.get(offerId);
                            if (!grouped) return null;

                            const offer = offersById.get(offerId);
                            if (!offer) return null;

                            return (
                                <section className="" key={offerId}>
                                    <div className="offerCardTitle">
                                        <img
                                            className="offerStubLogo"
                                            src={getProvider(offer.bankID)?.logo_url}
                                            alt={offer.bankID}
                                        />
                                        <span style={{ marginLeft: 10 }}>{offer.title}</span>
                                    </div>

                                    {grouped.groups.map((g) => (
                                        <div key={`${offerId}:${g.groupId}`} className="offerReqGroup">
                                            <div className="offerReqGroupTitle">{g.title}</div>

                                            <ul className="offerList">
                                                {g.reqs.map((r: any, i: number) => {
                                                    const reqId = `${g.groupId}:${reqIdFor(r, i)}`;
                                                    const selectedUserIds = selectedTodos[offerId]?.[reqId]?.marks ?? [];

                                                    return (
                                                        <RequirementRow
                                                            key={`${offerId}:${reqId}`}
                                                            offer={offer}
                                                            req={r}
                                                            users={people}
                                                            selectedUserIds={selectedUserIds}
                                                            onToggleUser={(userId) => toggleTodo(offerId, reqId, userId)}
                                                        />
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    ))}
                                </section>
                            );
                        })}
                    </div>
                ) : (
                    <div className="banner" style={{ padding: 12, opacity: 0.8 }}>
                        <p>Select an offer to see its details.</p>
                        <p>Once you've started working towards offers, their TODOs will appear here.</p>
                    </div>
                )}
            </div>
        );
    }

    function renderListItem(offer: any) {
        const p = getProvider(offer.bankID);
        const isAvailable = isOfferAvailable(offer);
        return (
            <div
                className={`offerStub ${selectedOfferID === offer.id ? 'active' : ''} ${!isAvailable ? 'expired' : ''}`}
                key={offer.id}
                onClick={() => setSelectedOfferID(prev => (prev === offer.id ? null : offer.id))}
                role="button"
                tabIndex={0}
            >
                <img className="offerStubLogo" src={p?.logo_url} alt={offer.bankID} />
                <div className="offerStubText">
                    <div className="offerStubTitleRow">
                        <div className="offerStubTitle">{offer.title}</div>
                        <div className="offerStubMeta">
                            {offer.availability?.start ? formatDate(offer.availability.start) : ''}
                            {' — '}
                            {offer.availability?.end ? formatDate(offer.availability.end) : 'present'}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    function isOfferAvailable(offer: Offer) {
        const activeOfferIds = Object.keys(selectedTodos);
        const isOfferStarted = activeOfferIds.includes(offer.id);
        const isOfferExpired = offer.availability?.end ? Date.now() > parseDateMs(offer.availability.end) : false;

        return isOfferStarted || !isOfferExpired;
    }

    return (
        <div>
            <div className="incentivesLayout">
                <aside className="banner incentivesSidebar">
                    <div className="sidebarHeaderRow">
                        <div>
                            <Tooltip placement='right'>
                                <TooltipTrigger>
                                    <ToggleSwitch
                                        isOn={showAllOffers}
                                        handleToggle={() => setShowExpired(prev => !prev)}
                                    />
                                </TooltipTrigger>
                                <TooltipContent>{showAllOffers ? 'Show only available offers' : 'Show all offers'}</TooltipContent>
                            </Tooltip>
                        </div>
                        <div className="sidebarTitle">
                            All {!showAllOffers && 'Available'} Offers
                        </div>
                        <div>
                            <RadioButtons
                                options={[
                                    { key: 'value', desc: 'Sort by value', icon: <MoneyBag /> },
                                    { key: 'date', desc: 'Sort by Expiration Date', icon: <EventRepeat /> },
                                ]}
                                selected={sortBy}
                                setSelected={(key: string) => setSortBy(key as 'value' | 'date')}
                                tooltipPlacement='bottom'
                                iconOnColour='green'
                                iconOffColour='#e3e3e3'
                            />
                        </div>
                    </div>

                    <div className="sidebarSectionTitle">CASS incentives</div>
                    <div className="offerList">
                        {
                            offers
                                .filter((o: Offer) => (showAllOffers || isOfferAvailable(o)) && o.scheme === 'CASS')
                                .sort((a: Offer, b: Offer) => {
                                    if (sortBy === 'value') {
                                        return a.value === b.value ? 0 : (a.value > b.value ? -1 : 1);
                                    }
                                    else if (sortBy === 'date') {
                                        const aDate = a.availability?.end ? parseDateMs(a.availability.end) : Number.POSITIVE_INFINITY;
                                        const bDate = b.availability?.end ? parseDateMs(b.availability.end) : Number.POSITIVE_INFINITY;
                                        return aDate === bDate ? 0 : (aDate < bDate ? -1 : 1);
                                    }
                                    else {
                                        return 0;
                                    }
                                })
                                .map(renderListItem)
                        }
                    </div>

                    <div className="sidebarSectionTitle">Other offers</div>
                    <div className="offerList">
                        {
                            offers
                                .filter((o: any) => (showAllOffers || isOfferAvailable(o)) && o.scheme !== 'CASS')
                                .sort((a: Offer, b: Offer) => {
                                    if (sortBy === 'value') {
                                        return a.value === b.value ? 0 : (a.value > b.value ? -1 : 1);
                                    }
                                    else if (sortBy === 'date') {
                                        const aDate = a.availability?.end ? parseDateMs(a.availability.end) : Number.POSITIVE_INFINITY;
                                        const bDate = b.availability?.end ? parseDateMs(b.availability.end) : Number.POSITIVE_INFINITY;
                                        return aDate === bDate ? 0 : (aDate < bDate ? -1 : 1);
                                    }
                                    else {
                                        return 0;
                                    }
                                })
                                .map(renderListItem)
                        }
                    </div>
                </aside>

                <main className="incentivesMain">
                    {
                        selectedOffer ? (
                            <OfferDetails
                                offer={selectedOffer}
                                users={people}
                                selectedTodos={selectedTodos}
                                toggleTodo={toggleTodo}
                                reqGroups={allReqGroups.find(g => g.offerId === selectedOffer.id)?.groups ?? []}
                            />
                        ) : (
                            renderMonolithTodos()
                        )
                    }
                </main>
            </div>

            <div className='banner footer'>
                <p>This page is for informational purposes only.</p>
                <p>
                    It summarises publicly available promotional offers and their stated terms.
                    It does not constitute financial advice or a recommendation.
                    You are responsible for reviewing the official terms and conditions and determining suitability for your circumstances.
                </p>
            </div>
        </div>
    );
}

function reqIdFor(r: any, i: number) {
    return String(r.id ?? `${r.type ?? 'req'}:${i}`);
}

type ReqGroup = {
    groupId: string;
    title: string;
    reqs: any[];
    payment?: Payment;
};

function OfferDetails({
    offer,
    users,
    selectedTodos,
    toggleTodo,
    reqGroups,
}: {
    offer: any;
    users: User[];
    selectedTodos: SelectedTodos;
    toggleTodo: (offerId: string, reqId: string, userId: string) => void;
    reqGroups: ReqGroup[];
}) {
    const provider = getProvider(offer.bankID);

    const offerId = String(offer.id);

    return (
        <div className="offerDetails">
            {/* Header */}
            <header className="offerDetailsHeader">
                {provider?.logo_url ? (
                    <img
                        className="offerDetailsLogo"
                        src={provider.logo_url}
                        alt={provider.display_name}
                    />
                ) : null}

                <div className="offerDetailsHeaderText">
                    <div className="offerDetailsTitle">{offer.title}</div>
                    <div className="offerDetailsHeadline">{headlineText(offer.headline)}</div>
                </div>
            </header>

            {/* Criteria */}
            {reqGroups.length ? (
                <section className="offerCard">
                    <div className="offerCardTitle">Criteria</div>

                    {reqGroups.map((g) => (
                        <div key={g.groupId} className="offerReqGroup">
                            <div className="offerGroupTitle">{g.title}</div>

                            <ul className="offerList">
                                {
                                    g.reqs.map((r: any, i: number) => {
                                        const reqId = `${g.groupId}:${reqIdFor(r, i)}`; // ensure uniqueness across groups
                                        const selectedUserIds = selectedTodos[offerId]?.[reqId]?.marks ?? [];

                                        return (
                                            <RequirementRow
                                                key={`${offerId}:${reqId}`}
                                                offer={offer}
                                                req={r}
                                                users={users}
                                                selectedUserIds={selectedUserIds}
                                                onToggleUser={(userId) => toggleTodo(offerId, reqId, userId)}
                                            />
                                        );
                                    })
                                }
                            </ul>
                        </div>
                    ))}
                </section>
            ) : null}

            {/* Eligibility */}
            {offer.eligibility?.length ? (
                <section className="offerCard">
                    <div className="offerCardTitle">Eligibility</div>
                    <ul className="offerList">
                        <div className="offerReqNotes">
                            <ul>
                                {offer.eligibility.map((x: string, i: number) => (
                                    offer.eligibility.length > 1 ? (
                                        <li key={i}>{x}</li>
                                    ) : (
                                        <span key={i}>{x}</span>
                                    )
                                ))}
                            </ul>
                        </div>
                    </ul>
                </section>
            ) : null}

            {/* Payments */}
            {reqGroups.length ? (
                <section className="offerCard">
                    <div className="offerCardTitle">Reward</div>

                    {reqGroups.map((g) => {
                        const payment: Payment = g.payment ?? offer.payment;
                        console.log(payment);
                        return (
                            <div key={g.groupId} className="offerReqGroup">
                                <div className="offerGroupTitle">{g.title}</div>

                                <ul className="offerList">
                                    <li className="offerListItem">
                                        {payment && (
                                            <>
                                                {payment.payout && (
                                                    <div className="muted">
                                                        {payment.payout.label ??
                                                            (payment.payout.days
                                                                ? `Paid within ${payment.payout.days} days`
                                                                : payment.payout.date
                                                                    ? `Paid on ${payment.payout.date}`
                                                                    : null)}
                                                    </div>
                                                )}


                                                {
                                                    payment.notes && (
                                                        <div className="offerReqNotes">
                                                            <ul>
                                                                {
                                                                    payment.notes.map((n: string, i: number) => (
                                                                        payment.notes && payment.notes.length > 1 ? (
                                                                            <li key={i}>{n}</li>
                                                                        ) : (
                                                                            <span key={i}>{n}</span>
                                                                        )
                                                                    ))
                                                                }
                                                            </ul>
                                                        </div>
                                                    )
                                                }
                                            </>
                                        )}
                                    </li>
                                </ul>
                            </div>
                        );
                    })}
                </section>
            ) : null}

            {/* Bonuses */}
            {offer.bonuses?.length ? (
                <details className="offerCard offerDetailsDisclosure">
                    <summary className="offerDisclosureSummary">Bonuses</summary>
                    <ul className="offerList offerDisclosureBody">
                        {offer.bonuses.map((b: any, i: number) => (
                            <li className="offerListItem" key={i}>
                                <div className="offerListItemTop">
                                    <strong>{b.title ?? b.type}</strong>
                                    {b.openBy ? (
                                        <span className="offerReqMeta">
                                            {' '}
                                            — open by {formatDate(b.openBy) ?? b.openBy}
                                        </span>
                                    ) : null}
                                    {typeof b.maxSavePerMonth === 'number' ? (
                                        <span className="offerReqMeta">
                                            {' '}
                                            • max {formatMoney(b.maxSavePerMonth)}/month
                                        </span>
                                    ) : null}
                                </div>
                                {b.notes ? <div className="offerReqNotes">{b.notes}</div> : null}
                            </li>
                        ))}
                    </ul>
                </details>
            ) : null}

            {/* Links */}
            {offer.links?.length ? (
                <section className="offerCard">
                    <div className="offerCardTitle">See Also</div>
                    <div className="offerLinks">
                        {
                            offer.links.map((l: any, i: number) => (
                                <>
                                    {i > 0 &&
                                        <span>•</span>
                                    }
                                    <a key={i} href={l.url} target="_blank" rel="noreferrer">
                                        {l.label ?? l.url}
                                    </a>
                                </>
                            ))
                        }
                    </div>
                </section>
            ) : null}
        </div>
    );
}

function RequirementRow({
    offer,
    req,
    users,
    selectedUserIds,
    onToggleUser,
}: {
    offer: Offer;
    req: any;
    users: User[];
    selectedUserIds: string[];
    onToggleUser: (userId: string) => void;
}) {
    const hasExtra = Boolean((req?.notes ?? []).length);
    const summaryContent = (
        <>
            <strong className="offerReqChip">{reqChip(req)}</strong>
            {
                reqMeta(req).length ? (
                    <span className="offerReqMeta"> — {reqMeta(req).join(' • ')}</span>
                ) : null
            }
        </>
    );

    return (
        <li className="offerListItem">
            <div className="offerListItemTop">
                {
                    users
                        .filter(u => offer.canRepeat === 'joint' || u.id !== 'joint') // only show joint option if offer is joint-repeatable
                        .map(user =>
                            renderUserChip(
                                user,
                                selectedUserIds.includes(user.id),
                                () => onToggleUser(user.id)
                            )
                        )
                }

                <div className="reqText">
                    {hasExtra ? (
                        <details className="offerDetailsDisclosure">
                            <summary>{summaryContent}</summary>
                            <div className="offerReqNotes">
                                <ul>
                                    {
                                        req.notes.map((n: string, i: number) => (
                                            req.notes.length > 1 ? (
                                                <li key={i}>{n}</li>
                                            ) : (
                                                <span key={i}>{n}</span>
                                            )
                                        ))
                                    }
                                </ul>
                            </div>
                        </details>
                    ) : (
                        <div>{summaryContent}</div>
                    )}
                </div>
            </div>
        </li>
    );
}

function renderUserChip(user: User, selected: boolean, onClick?: () => void) {
    return (
        <Tooltip>
            <TooltipTrigger>
                <img
                    className={`offerReqUser ${selected ? '' : 'unselected'}`}
                    src={user.icon}
                    alt={user.name}
                    title={user.name}
                    onClick={onClick}
                />
            </TooltipTrigger>
            <TooltipContent>Mark as {selected && 'not'} done by {user.name}</TooltipContent>
        </Tooltip>
    );
}

function formatMoney(n: number) {
    return n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
}

function getProvider(providerID: string) {
    if (!providerID) return null;
    return (
        trueLayercachedProviders.find(p => p.provider_id === providerID) ??
        closedProviders.find(p => p.provider_id === providerID) ??
        null
    );
}

function parseDateMs(date?: string) {
    if (!date) return Number.POSITIVE_INFINITY;
    const ms = Date.parse(date);
    return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
}

function formatDate(d?: string) {
    if (!d) return null;

    const ms = Date.parse(d);
    if (!Number.isFinite(ms)) return d;

    const date = new Date(ms);

    const formatted = date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

    return formatted.toUpperCase(); // 01 FEB 2026
}

function headlineText(headline: any) {
    const bits: string[] = [];
    if (typeof headline?.credit === 'number') bits.push(`${formatMoney(headline.credit)} credit`);
    if (typeof headline?.credit2 === 'number') bits.push(`${formatMoney(headline.credit2)} credit`);
    if (typeof headline?.credit2Text === 'string') bits.push(headline.credit2Text);
    if (typeof headline?.amazon === 'number') bits.push(`${formatMoney(headline.amazon)} Amazon`);
    if (typeof headline?.prize === 'string') bits.push(headline.prize);
    return bits.length ? bits.join(' • ') : '—';
}

function reqChip(r: Requirement) {
    const count = r.countAtLeast ?? r.count ?? r.countAtMost;
    const amount = typeof r.amount === 'number' ? formatMoney(r.amount) : '';
    switch (r.type) {
        case 'switch':
            return `Switch (${r.scheme ?? 'CASS'}${r.mustBeFull ? ', full' : ''})`;
        case 'openAccount':
            return `Open account (${(r.accountTypes ?? []).join(' / ') || '—'})`;
        case 'holdAccount':
            return `Hold an account (${(r.accountTypes ?? []).join(' / ') || '—'})`;
        case 'payIn':
            return `Pay in ${amount}`;
        case 'directDebits':
            return `Direct Debits (${count ?? '—'})`;
        case 'standingOrdersOrDirectDebits':
            return `SO/DD (${count ?? '—'})`;
        case 'debitCardTx':
            return `Card spend (${count ?? '—'})`;
        case 'login':
            return `Login (${r.channel ?? '—'})`;
        case 'register':
            return `Register (${r.channel ?? '—'})`;
        case 'form':
            return <span>Submit <a href={r.url} target="_blank">form</a></span>;
        case 'entry_deposit':
            return `Entry by ${amount} Deposit`;
        case 'entry_notice':
            return `Entry by ${r.channel} notice`;
        default:
            return String(r.type ?? 'Requirement');
    }
}

function reqMeta(r: any, data?: any) {
    const bits: string[] = [];

    if (typeof r.count === 'number') bits.push(`count ${r.count}`);
    if (typeof r.countAtLeast === 'number') bits.push(`≥ ${r.countAtLeast}`);
    if (typeof r.countAtMost === 'number') bits.push(`≤ ${r.countAtMost}`);
    if (typeof r.amount === 'number') bits.push(formatMoney(r.amount));

    // Unknown/nullable boolean support
    if (r.mustBeActive === true) bits.push('active');
    if (r.mustBeActive === false) bits.push('not active');

    const dateBits: string[] = [];
    if (r.windowDays) dateBits.push(`within ${r.windowDays} days`);
    if (r.windowDaysFrom) {
        const windowDaysFrom = data?.windowDaysFrom;
        const windowDaysFromDate = formatDate(windowDaysFrom) ?? r.windowDaysFrom;
        dateBits.push(`from ${windowDaysFromDate}`);
    }
    if (r.anchor) dateBits.push(`anchor ${r.anchor}`);
    if (dateBits.length) {
        bits.push(dateBits.join(' '));
    }

    if (r.mustRequestBy) bits.push(`request by ${formatDate(r.mustRequestBy) ?? r.mustRequestBy}`);

    return bits;
}

export default IncentivesPage;