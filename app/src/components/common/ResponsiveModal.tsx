import React, {
    useEffect,
    useRef,
    useState,
    ReactNode,
    FocusEvent,
    createContext,
    useContext
} from 'react';
import ReactDOM from 'react-dom';
import './ResponsiveModal.css';

type Props = {
    open: boolean;
    title?: string;
    children: ReactNode;
    onClose: () => void;
    forceMode?: 'bottomSheet' | 'centreModal';
};

const SheetModeContext = createContext(false);

type SheetOnlyProps = { children: ReactNode };
const SheetOnly: React.FC<SheetOnlyProps> = ({ children }) => {
    const isSheet = useContext(SheetModeContext);
    return isSheet ? <>{children}</> : null;
};

type ResponsiveModalType = React.FC<Props> & { SheetOnly: React.FC<SheetOnlyProps> };

export const ResponsiveModal: ResponsiveModalType = ({ open, title, children, onClose, forceMode, }) => {

    const [isMobile, setIsMobile] = useState(false);
    const [keyboardActive, setKeyboardActive] = useState(false);

    const [isClosing, setIsClosing] = useState(false);

    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const update = () => setIsMobile(window.innerWidth <= 600);
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    if (!open) return null;

    function handleRequestClose(isSheet: boolean) {
        if (isSheet) {
            setIsClosing(true);
            // wait for animation to finish
            setTimeout(() => {
                setIsClosing(false);
                onClose();
            }, 200);
        }
        else {
            onClose();
        }
    };

    const modeClass = forceMode || (isMobile ? 'bottomSheet' : 'centreModal');
    const isSheet = modeClass === 'bottomSheet';
    const className = `
        ${modeClass}
        ${keyboardActive && modeClass === 'centreModal' ? ' keyboard-active' : ''}
        ${isClosing ? ' closing' : ''}
    `;

    return ReactDOM.createPortal(
        <div className="modalOverlay" onClick={() => handleRequestClose(isSheet)}>
            <div
                ref={modalRef}
                className={className}
                onClick={e => e.stopPropagation()}
                onFocusCapture={(_e: FocusEvent) => setKeyboardActive(isMobile)}
                onBlurCapture={(_e: FocusEvent) => setKeyboardActive(false)}
                tabIndex={-1}
            >
                <SheetModeContext.Provider value={isSheet}>
                    {title && <h2>{title}</h2>}
                    {children}
                </SheetModeContext.Provider>
            </div>
        </div>,
        document.body
    );
};

ResponsiveModal.SheetOnly = SheetOnly;
