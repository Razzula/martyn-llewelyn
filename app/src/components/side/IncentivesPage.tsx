import { useEffect, useMemo, useState } from 'react';

import { incentives } from '../../data/incentives';
import { trueLayercachedProviders, closedProviders } from '../../data/providers';
import { User } from 'src/types/Bagel';

import '../../styles/App.css';
import './IncentivesPage.css';
import { Tooltip, TooltipContent, TooltipTrigger } from '../common/Tooltip';
import { ToggleSwitch } from '../common/ToggleSwitch';

type SelectedTodos = Record<string, Record<string, string[]>>;

type IncentivesPageProps = {
    users: User[];
};

function IncentivesPage({ users, }: IncentivesPageProps) {
    const offers = incentives.data ?? [];

    const selectedTodosStorageKey = 'bagel:selectedTodos:v1';

    const [selectedTodos, setSelectedTodos] = useState<SelectedTodos>(() => loadSelectedTodos());
    const [selectedOfferID, setSelectedOfferID] = useState<string | null>(null);
    const [showExpired, setShowExpired] = useState(false);

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

    type ReqEntry = { reqId: string; req: any };
    type OfferReqIndex = Map<string, { offer: any; reqs: ReqEntry[] }>;

    const offerReqIndex = useMemo<OfferReqIndex>(() => {
        const idx = new Map<string, { offer: any; reqs: ReqEntry[] }>();

        for (const o of offers as any[]) {
            const offerId = String(o.id);

            const allReqs = [
                ...(o.requirements ?? []),
                ...(o.components ?? []).flatMap((c: any) => c.requirements ?? []),
            ];

            const reqs: ReqEntry[] = allReqs.map((r: any, i: number) => ({
                reqId: reqIdFor(r, i), // same function used in OfferDetails
                req: r,
            }));

            idx.set(offerId, { offer: o, reqs });
        }

        return idx;
    }, [offers]);

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
            const prevArr = offerMap[reqId] ?? [];

            const has = prevArr.includes(userId);
            const nextArr = has ? prevArr.filter(x => x !== userId) : [...prevArr, userId];

            if (nextArr.length === 0) {
                delete offerMap[reqId];
            } else {
                offerMap[reqId] = nextArr;
            }

            if (Object.keys(offerMap).length === 0) {
                delete next[offerId];
            } else {
                next[offerId] = offerMap;
            }

            return next;
        });
    }

    function renderMonolithTodos() {
        const activeOfferIds = Object.keys(selectedTodos); // offers with any partial completion

        return (
            <div className="column" style={{ gap: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Your Offers</div>

                {activeOfferIds.length ? (
                    <div className="column" style={{ gap: 12 }}>
                        {activeOfferIds.map((offerId) => {
                            const hit = offerReqIndex.get(offerId);
                            if (!hit) return null;

                            const { offer, reqs } = hit;

                            return (
                                <section className="offerCard" key={offerId}>
                                    <div className="offerCardTitle">{offer.title}</div>
                                    <ul className="offerList">
                                        {reqs.map(({ reqId, req }) => {
                                            const selectedUserIds = selectedTodos[offerId]?.[reqId] ?? [];

                                            return (
                                                <RequirementRow
                                                    key={`${offerId}:${reqId}`}
                                                    offerId={offerId}
                                                    offerTitle={offer.title}
                                                    reqId={reqId}
                                                    req={req}
                                                    users={people}
                                                    selectedUserIds={selectedUserIds}
                                                    onToggleUser={(userId) => toggleTodo(offerId, reqId, userId)}
                                                />
                                            );
                                        })}
                                    </ul>
                                </section>
                            );
                        })}
                    </div>
                ) : (
                    <div className="banner" style={{ padding: 12, opacity: 0.8 }}>
                        <p>Select an offer from the left to see its details.</p>
                        <p>Once you've started working towards offers, their TODOs will appear here.</p>
                    </div>
                )}
            </div>
        );
    }

    function renderListItem(offer: any) {
        const p = getProvider(offer.bankID);
        return (
            <div
                className={`offerStub ${selectedOfferID === offer.id ? 'active' : ''}`}
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
                            {offer.availability?.end ? formatDate(offer.availability.end) : ''}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="incentivesLayout">
                <aside className="banner incentivesSidebar">
                    <div className='row'>
                        {/* <ToggleSwitch isOn={!showExpired} handleToggle={() => setShowExpired(prev => !prev)} /> */}
                        <div className="sidebarTitle">All { !showExpired && 'Available' } Offers</div>
                    </div>

                    <div className="sidebarSectionTitle">CASS incentives</div>
                    <div className="offerList">
                        {
                            offers
                                .filter((o: any) => o.scheme === 'CASS')
                                .sort((a: any, b: any) => a.value === b.value ? 0 : (a.value > b.value ? -1 : 1)) // sort by value desc
                                .map(renderListItem)
                        }
                    </div>

                    <div className="sidebarSectionTitle">Other offers</div>
                    <div className="offerList">
                        {
                            offers
                                .filter((o: any) => o.scheme !== 'CASS')
                                .sort((a: any, b: any) => a.value === b.value ? 0 : (a.value > b.value ? -1 : 1)) // sort by value desc
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

function OfferDetails({
    offer,
    users,
    selectedTodos,
    toggleTodo,
}: {
    offer: any;
    users: User[];
    selectedTodos: Record<string, Record<string, string[]>>;
    toggleTodo: (offerId: string, reqId: string, userId: string) => void;
}) {
    const provider = getProvider(offer.bankID);
    const dates = collectDates(offer);

    const allReqs = [
        ...(offer.requirements ?? []),
        ...(offer.components ?? []).flatMap((c: any) => c.requirements ?? []),
    ];

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
            {
                allReqs.length ? (
                    <section className="offerCard">
                        <div className="offerCardTitle">Criteria</div>
                        <ul className="offerList">
                            {allReqs.map((r: any, i: number) => {
                                const offerId = String(offer.id);
                                const reqId = reqIdFor(r, i);
                                const selectedUserIds = selectedTodos[offerId]?.[reqId] ?? [];

                                return (
                                    <RequirementRow
                                        key={`${offerId}:${reqId}`}
                                        offerId={offerId}
                                        offerTitle={offer.title}
                                        reqId={reqId}
                                        req={r}
                                        users={users}
                                        selectedUserIds={selectedUserIds}
                                        onToggleUser={(userId) => toggleTodo(offerId, reqId, userId)}
                                    />
                                );
                            })}
                        </ul>
                    </section>
                ) : null
            }

            {/* Eligibility */}
            {offer.eligibility?.length ? (
                <section className="offerCard">
                    <div className="offerCardTitle">Eligibility</div>
                    <ul className="offerList">
                        {offer.eligibility.map((x: string, i: number) => (
                            <li className="offerListItem" key={i}>
                                {x}
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            {/* Dates */}
            {dates.length ? (
                <details className="offerCard offerDetailsDisclosure">
                    <summary className="offerDisclosureSummary">Dates &amp; timeline</summary>
                    <ul className="offerList offerDisclosureBody">
                        {dates.map((d, i) => (
                            <li className="offerListItem" key={i}>
                                <code className="offerCode">{formatDate(d.date) ?? d.date}</code>
                                <span className="offerDash">—</span>
                                <span>{d.label}</span>
                            </li>
                        ))}
                    </ul>
                </details>
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
                                {b.note ? <div className="offerReqNotes">{b.note}</div> : null}
                            </li>
                        ))}
                    </ul>
                </details>
            ) : null}

            {/* Notes */}
            {offer.noteLong ? (
                <details className="offerCard offerDetailsDisclosure">
                    <summary className="offerDisclosureSummary">Notes</summary>
                    <div className="offerNotes offerDisclosureBody">{offer.noteLong}</div>
                </details>
            ) : null}

            {/* Links */}
            {offer.links?.length ? (
                <section className="offerCard">
                    <div className="offerCardTitle">Links</div>
                    <div className="offerLinks">
                        {offer.links.map((l: any, i: number) => (
                            <a key={i} href={l.url} target="_blank" rel="noreferrer">
                                {l.label ?? 'Link'}
                            </a>
                        ))}
                    </div>
                </section>
            ) : null}
        </div>
    );
}

function RequirementRow({
    offerId,
    offerTitle,
    reqId,
    req,
    users,
    selectedUserIds,
    onToggleUser,
}: {
    offerId: string;
    offerTitle: string;
    reqId: string;
    req: any;
    users: User[];
    selectedUserIds: string[];
    onToggleUser: (userId: string) => void;
}) {
    return (
        <li className="offerListItem" key={`${offerId}:${reqId}`}>
            <div className="offerListItemTop">
                {users.map(u =>
                    renderUserChip(
                        u,
                        selectedUserIds.includes(u.id),
                        () => onToggleUser(u.id)
                    )
                )}

                <strong className="offerReqChip">{reqChip(req)}</strong>

                {reqMeta(req).length ? (
                    <span className="offerReqMeta"> — {reqMeta(req).join(' • ')}</span>
                ) : null}
            </div>

            {req?.note ? <div className="offerReqNotes">{req.note}</div> : null}
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
            <TooltipContent>{user.name}</TooltipContent>
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

type TodoItem = {
    id: string;
    offerId: string;
    offerTitle: string;
    label: string;
    date?: string; // ISO-ish string if available, e.g. "2026-06-16"
};

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

function reqChip(r: any) {
    // Minimal “human” label per requirement type
    switch (r.type) {
        case 'switch':
            return `Switch (${r.scheme ?? 'CASS'}${r.mustBeFull ? ', full' : ''})`;
        case 'openAccount':
            return `Open account (${(r.accountTypes ?? []).join(' / ') || '—'})`;
        case 'payIn':
            return `Pay in ${typeof r.amount === 'number' ? formatMoney(r.amount) : ''}`;
        case 'directDebits':
            return `Direct Debits (${r.count ?? '—'})`;
        case 'standingOrdersOrDirectDebits':
            return `SO/DD (${r.countAtLeast ?? '—'})`;
        case 'debitCardTx':
            return `Card spend (${r.countAtLeast ?? r.count ?? '—'})`;
        case 'login':
            return `Login (${r.channel ?? '—'})`;
        case 'form':
            return <span>Submit <a href={r.url}>form</a></span>;
        default:
            return String(r.type ?? 'Requirement');
    }
}

function reqMeta(r: any) {
    const bits: string[] = [];

    if (typeof r.count === 'number') bits.push(`count ${r.count}`);
    if (typeof r.countAtLeast === 'number') bits.push(`≥ ${r.countAtLeast}`);
    if (typeof r.amount === 'number') bits.push(formatMoney(r.amount));

    // Unknown/nullable boolean support
    if (r.mustBeActive === true) bits.push('active');
    if (r.mustBeActive === false) bits.push('not active');
    if (r.mustBeActive == null && 'mustBeActive' in r) bits.push('active: unknown');

    if (r.windowDays) bits.push(`within ${r.windowDays} days`);
    if (r.windowDaysFrom) bits.push(`from ${r.windowDaysFrom}`);
    if (r.anchor) bits.push(`anchor ${r.anchor}`);

    if (r.mustRequestBy) bits.push(`request by ${formatDate(r.mustRequestBy) ?? r.mustRequestBy}`);

    return bits;
}

function collectDates(offer: any) {
    const dates: { label: string; date: string }[] = [];

    // Offer-level requirement deadlines
    (offer.requirements ?? []).forEach((r: any) => {
        if (r.mustRequestBy) dates.push({ label: 'Request by', date: r.mustRequestBy });
    });

    // Components deadlines
    (offer.components ?? []).forEach((c: any) => {
        (c.deadlines ?? []).forEach((d: any) => {
            if (d?.date) dates.push({ label: d.label ?? d.type ?? 'Deadline', date: d.date });
        });
    });

    // Availability withdrawn date
    if (offer.availability?.withdrawnDate) {
        dates.push({ label: offer.availability.withdrawnLabel ?? 'Withdrawn', date: offer.availability.withdrawnDate });
    }

    // Timeline notes
    (offer.timelineNotes ?? []).forEach((t: any) => {
        if (t?.date) dates.push({ label: t.label ?? 'Note', date: t.date });
    });

    // Sort ascending
    dates.sort((a, b) => (Date.parse(a.date) || 9e15) - (Date.parse(b.date) || 9e15));
    return dates;
}

// A deliberately “best-effort” one-liner, based on what your model contains.
// If you later add explicit openBy / mustCompleteBy at offer-level, update here.
// function oneLiner(offer: any) {
//     const bank = getProvider(offer.bankID)?.display_name ?? offer.bankID ?? '—';
//     const headline = headlineText(offer.headline);

//     const dates = collectDates(offer);
//     const keyDates = dates
//         .filter(d => d.date)
//         .slice(0, 2) // keep it short
//         .map(d => `${d.label.toLowerCase()} ${formatDate(d.date) ?? d.date}`)
//         .join('; ');

//     const scheme = offer.scheme ? `${offer.scheme}` : '';

//     const value = typeof offer.value === 'number' ? `(${formatMoney(offer.value)} max)` : '';
//     const dateBit = keyDates ? ` — ${keyDates}` : '';

//     return `${headline} when you take out ${offer.title}${scheme ? ` (${scheme})` : ''} ${value}. ${bank}${dateBit}. T&Cs apply.`;
// }

export default IncentivesPage;