import '../styles/ToggleSwitch.css';

interface ToggleSwitchProps {
    isOn: boolean;
    handleToggle: () => void;
}

export function ToggleSwitch({ isOn, handleToggle }: ToggleSwitchProps) {
    return (
        <label className="toggle-switch">
            <input
                type="checkbox"
                checked={isOn}
                onChange={handleToggle}
            />
            <span className="toggle-slider"></span>
        </label>
    );
}
