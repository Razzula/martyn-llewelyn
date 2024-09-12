import { useRef, useState, useEffect, RefObject, ChangeEvent } from "react";
import "./styles.css";

interface Segment {
    value: string;
    label: string;
    ref: RefObject<HTMLDivElement>;
}

interface SegmentedControlProps {
    name: string;
    segments: Segment[];
    callback: (value: string, index: number) => void;
    defaultIndex?: number;
    controlRef: RefObject<HTMLDivElement>;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({
    name,
    segments,
    callback,
    defaultIndex = 0,
    controlRef
}) => {
    const [activeIndex, setActiveIndex] = useState<number>(defaultIndex);
    const componentReady = useRef<boolean>(false);

    // Determine when the component is "ready"
    useEffect(() => {
        componentReady.current = true;
    }, []);

    useEffect(() => {
        if (segments.length === 0 || !controlRef.current) return;

        const activeSegmentRef = segments[activeIndex].ref;
        if (!activeSegmentRef.current) return;

        const { offsetWidth, offsetLeft } = activeSegmentRef.current;
        const { style } = controlRef.current;

        style.setProperty("--highlight-width", `${offsetWidth}px`);
        style.setProperty("--highlight-x-pos", `${offsetLeft}px`);
    }, [activeIndex, callback, controlRef, segments]);

    const onInputChange = (value: string, index: number) => {
        setActiveIndex(index);
        callback(value, index);
    };

    return (
        <div className="controls-container" ref={controlRef}>
            <div className={`controls ${componentReady.current ? "ready" : "idle"}`}>
                {segments?.map((item, i) => (
                    <div
                        key={item.value}
                        className={`segment ${i === activeIndex ? "active" : "inactive"}`}
                        ref={item.ref}
                    >
                        <input
                            type="radio"
                            value={item.value}
                            id={item.label}
                            name={name}
                            onChange={() => onInputChange(item.value, i)}
                            checked={i === activeIndex}
                        />
                        <label htmlFor={item.label}>{item.label}</label>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SegmentedControl;
