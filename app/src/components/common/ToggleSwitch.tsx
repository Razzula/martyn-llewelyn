import './ToggleSwitch.css';

interface ToggleSwitchProps {
    isOn: boolean;
    handleToggle: () => void;
    iconOn?: React.ReactNode;
    iconOff?: React.ReactNode;
    iconOnColour?: string;
    iconOffColour?: string;
}

const defaultIconOnColour = '#e3e3e3';

export function ToggleSwitch({ isOn, handleToggle, iconOn, iconOff, iconOnColour, iconOffColour, }: ToggleSwitchProps) {

    // if only one icon is provided, use it for both states
    const iconOnElement = iconOn || iconOff || null;
    const iconOffElement = iconOff || iconOn || null;

    const onColour = iconOnColour || defaultIconOnColour;
    const offColour = iconOffColour || defaultIconOnColour;

    return (
        <label
            className='toggleSwitch'
            style={{ ['--iconColor' as any]: isOn ? onColour : offColour }}
        >
            
            <input
                type='checkbox'
                checked={isOn}
                onChange={handleToggle}
            />
            <span className='toggleSlider'>
                <span className='toggleBall' style={{ color: 'var(--iconColor)' }}>
                    {isOn ? iconOnElement : iconOffElement}
                </span>
            </span>

        </label>
    );
}
