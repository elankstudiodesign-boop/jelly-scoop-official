import React from 'react';
import { NumericFormat, NumericFormatProps } from 'react-number-format';
import { cn } from '../lib/utils';

interface CurrencyInputProps extends Omit<NumericFormatProps, 'onChange'> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  onValueChange?: (values: { value: string; floatValue: number | undefined }) => void;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({
  label,
  error,
  icon,
  className,
  onValueChange,
  ...props
}) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-black text-slate-500 uppercase tracking-wider ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
            {icon}
          </div>
        )}
        <NumericFormat
          thousandSeparator="."
          decimalSeparator=","
          suffix=" ₫"
          allowNegative={false}
          onValueChange={(values) => {
            if (onValueChange) {
              onValueChange({
                value: values.value,
                floatValue: values.floatValue
              });
            }
          }}
          className={cn(
            "w-full h-12 bg-white border-2 border-slate-100 rounded-2xl px-4 text-sm font-bold transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none placeholder:text-slate-300",
            icon && "pl-11",
            error && "border-red-100 focus:border-red-500 focus:ring-red-500/10",
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-[10px] font-bold text-red-500 ml-1 mt-1">
          {error}
        </p>
      )}
    </div>
  );
};

export default CurrencyInput;
