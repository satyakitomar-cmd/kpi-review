import { RATING_MIN, RATING_MAX } from '../lib/constants';

export default function RatingInput({ value, onChange, disabled }) {
  const handleChange = (e) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange('');
      return;
    }
    // Only allow single digits 1-5
    const num = parseInt(raw, 10);
    if (isNaN(num)) return;
    if (num < RATING_MIN) {
      onChange(RATING_MIN);
    } else if (num > RATING_MAX) {
      onChange(RATING_MAX);
    } else {
      onChange(num);
    }
  };

  const handleKeyDown = (e) => {
    // Allow: backspace, delete, tab, escape, enter, arrows
    const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowed.includes(e.key)) return;
    // Block anything that's not 1-5
    if (!/^[1-5]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text');
    const num = parseInt(pasted, 10);
    if (isNaN(num) || num < RATING_MIN || num > RATING_MAX) {
      e.preventDefault();
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      maxLength={1}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      disabled={disabled}
      className="w-16 text-center border border-gray-300 rounded-lg py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
      placeholder="1-5"
    />
  );
}
