import './ToggleSwitch.css';

interface ToggleSwitchProps {
    isOn: boolean;
    handleToggle: () => void;
    iconOn?: React.ReactNode;
    iconOff?: React.ReactNode;
}

export function ToggleSwitch({ isOn, handleToggle, iconOn, iconOff }: ToggleSwitchProps) {

    // if only one icon is provided, use it for both states
    const iconOnElement = iconOn || iconOff || null;
    const iconOffElement = iconOff || iconOn || null;

    return (
        <label className='toggleSwitch'>
            
            <input
                type='checkbox'
                checked={isOn}
                onChange={handleToggle}
            />
            <span className='toggleSlider'>
                <span className='toggleBall'>
                    {isOn ? iconOnElement : iconOffElement}
                </span>
            </span>

        </label>
    );
}
