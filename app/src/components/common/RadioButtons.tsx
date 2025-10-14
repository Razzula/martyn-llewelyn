import { useEffect, useState } from 'react';

import './RadioButtons.css';
import { Tooltip, TooltipContent, TooltipOptions, TooltipTrigger } from './Tooltip';

interface RadioButtonsProps {
    options: {
        key: string,
        desc: string,
        icon?: React.ReactNode,
    }[],
    selected: string | null | undefined,
    setSelected: (key: string) => void,
    iconOnColour?: string;
    iconOffColour?: string;
    tooltipPlacement?: TooltipOptions['placement'];
}

const defaultIconOnColour = '#e3e3e3';

export function RadioButtons({ options, selected, setSelected, iconOnColour, iconOffColour, tooltipPlacement }: RadioButtonsProps) {

    const [selectedOption, setSelectedOption] = useState<RadioButtonsProps['options'][number] | undefined>(undefined);

    useEffect(() => {
        setSelectedOption(options.find(o => o.key === selected));
    }, [options, selected])

    const onColour = iconOnColour || defaultIconOnColour;
    const offColour = iconOffColour || defaultIconOnColour;

    return (
        <label
            className='radioButtons'
            // style={{ ['--iconColor' as any]: isOn ? onColour : offColour }}
        >
            {
                options.map(option =>
                    <Tooltip placement={tooltipPlacement}>
                        <TooltipTrigger>
                            <span
                                className='clickable'
                                style={{ color: option.key === selectedOption?.key ? onColour : offColour }}
                                onClick={() => setSelected(option.key)}
                            >
                                {option.icon}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>{option?.desc}</TooltipContent>
                    </Tooltip>
                )
            }
        </label>
    );
}

interface ToggleButtonProps {
    options: {
        key: string,
        desc: string,
        icon?: React.ReactNode,
        iconColour?: string,
    }[],
    selected: string | null | undefined,
    setSelected: (key: string) => void,
    tooltipPlacement?: TooltipOptions['placement'];
}

export function ToggleButton({ options, selected, setSelected, tooltipPlacement }: ToggleButtonProps) {

    const [selectedOption, setSelectedOption] = useState<ToggleButtonProps['options'][number]>(options[0]);
    const [alternateOption, setAlternateOption] = useState<ToggleButtonProps['options'][number]>(options[1]);

    useEffect(() => {
        const option = options.find(o => o.key === selected) ?? options[0]; // default to first option, if not matching
        setSelectedOption(option);
        setAlternateOption(
            options.find(o => o.key !== selected) ?? options[1]
        );
    }, [options, selected])

    return (
        <label
            className='toggleButton'
            // style={{ ['--iconColor' as any]: isOn ? onColour : offColour }}
        >
            {
                <Tooltip placement={tooltipPlacement}>
                    <TooltipTrigger>
                        <span
                            className='clickable'
                            style={{ color: selectedOption.iconColour }}
                            onClick={() => setSelected(alternateOption.key)}
                        >
                            {selectedOption.icon}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>{selectedOption?.desc}</TooltipContent>
                </Tooltip>
            }
        </label>
    );
}
