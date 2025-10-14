import { useFloating, offset, flip, shift, autoUpdate, FloatingPortal, FloatingFocusManager, useInteractions, useClick, useDismiss, useRole, useListNavigation } from '@floating-ui/react';
import React, { useEffect } from 'react';

import './Select.css';

interface SelectProps {
    className?: string;
    entries: { name: string; key: string; element: React.ReactNode; icon?: JSX.Element }[],
    setSelected: (name: string) => void;
    forcedIndex?: number;
    icon?: JSX.Element | string;
    emptyText?: string;
    disabled?: boolean;
    mode?: 'list' | 'grid';

    windowMaxWidth?: number;
}

function Select({ className, entries, setSelected, icon, forcedIndex, emptyText, disabled, mode = 'list', windowMaxWidth }: SelectProps): JSX.Element {

    const [isOpen, setIsOpen] = React.useState(false);
    const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
    const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
    const [selectedIcon, setSelectedIcon] = React.useState<JSX.Element | string | null>(null);

    useEffect(() => {
        if (forcedIndex !== undefined && forcedIndex >= 0 && forcedIndex < entries.length) {
            setSelectedIndex(forcedIndex);
        }
    }, [forcedIndex, entries]);

    useEffect(() => {
        if (selectedIndex !== null && entries[selectedIndex]?.icon) {
            setSelectedIcon(
                entries[selectedIndex].icon
            );
        }
        else if (icon) {
            setSelectedIcon(
                icon
            );
        }
        else {
            setSelectedIcon(null);
        }
    }, [selectedIndex, icon]);

    const { refs, floatingStyles, context } = useFloating({
        open: isOpen,
        onOpenChange: setIsOpen,
        placement: 'bottom',
        middleware: [offset(10), flip(), shift()],
        whileElementsMounted: autoUpdate,
    });

    const listRef = React.useRef<Array<HTMLElement | null>>([]);
    // const listContentRef = React.useRef(temp);
    // const isTypingRef = React.useRef(false);

    const click = useClick(context, { event: "mousedown" });
    const dismiss = useDismiss(context);
    const role = useRole(context, { role: "listbox" });
    const listNav = useListNavigation(context, {
        listRef,
        activeIndex,
        selectedIndex,
        onNavigate: setActiveIndex,
        // This is a large list, allow looping.
        loop: true,
    });
    // const typeahead = useTypeahead(context, {
    //     listRef: listContentRef,
    //     activeIndex,
    //     selectedIndex,
    //     onMatch: isOpen ? setActiveIndex : setSelectedIndex,
    //     onTypingChange(isTyping) {
    //         isTypingRef.current = isTyping;
    //     },
    // });

    const { getReferenceProps, getFloatingProps } = useInteractions(
        [dismiss, role, listNav, disabled ? undefined : click].filter(Boolean)
    );

    const handleSelect = (index: number) => {
        if (disabled) return;

        setSelectedIndex(index);
        setIsOpen(false);
        setSelected(entries[index].key);
    };

    return (<>
        <span
            className={`${className} selectContainer ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
            ref={refs.setReference}
            {...getReferenceProps()}
        >
            { selectedIcon ?? ((selectedIndex !== null && selectedIndex >= 0) ? entries[selectedIndex]?.name : <span className='empty'>{emptyText ?? '...'}</span>)}
            {/* {(selectedIndex !== null && selectedIndex >= 0) ? entries[selectedIndex]?.name : '...'} */}
            {/* <img src='./icons/drop.svg' alt='Arrow Down'/> */}
        </span>

        {isOpen && (
            <FloatingPortal>
                <FloatingFocusManager context={context} modal={false}>
                    <div
                        className={`selectOptions ${mode}`}
                        ref={refs.setFloating}
                        style={{
                            ...floatingStyles,
                            overflowY: "auto",
                            minWidth: 100,
                            borderRadius: 8,
                            outline: 0,
                            maxWidth: windowMaxWidth ?? 500,
                        }}
                        {...getFloatingProps()}
                    >
                        {entries.map((entry, index) => (
                            <div
                                key={entry.key}
                                className='selectOption'
                                style={{
                                    cursor: 'pointer',
                                }}
                                onClick={() => handleSelect(index)}
                            >
                                {entry.element}
                            </div>
                        ))}
                    </div>
                </FloatingFocusManager>
            </FloatingPortal>
        )}

    </>);
};

export default Select;
