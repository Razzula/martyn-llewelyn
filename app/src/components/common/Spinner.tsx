import './Spinner.css';

type SpinnerProps = {
    useOverlay?: boolean;
};

function Spinner({ useOverlay = false }: SpinnerProps) {
    return (
        <div className={useOverlay ? 'spinnerOverlay' : ''}>
            <div className='spinner' />
        </div>
    );
}

export default Spinner;
