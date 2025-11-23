import React from 'react';

export default function BasicCard({ title, price, description, image, buttonText, onButtonClick, children, buttonDisabled = false }) {
  return (
    <div className="relative flex flex-col my-3 sm:my-4 bg-white shadow-xl rounded-2xl w-full max-w-xs sm:w-80 p-3 sm:p-5 border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
      {image && (
        <div className="relative h-28 sm:h-36 overflow-hidden rounded-xl mb-3 shadow-md">
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10"></div>
          <img
            src={image}
            alt="card-image"
            className="h-28 sm:h-36 w-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>
      )}
      {title && (
        <div className="mb-2 w-full flex items-center justify-between">
          {typeof title === 'string' ? (
          <p className="text-slate-900 text-base sm:text-lg font-bold">{title}</p>
          ) : (
            <div className="text-slate-900 text-base sm:text-lg font-bold">{title}</div>
          )}
          {price && (typeof price === 'string' ? (
            <p className="text-cyan-600 text-base sm:text-lg font-bold">{price}</p>
          ) : (
            <div className="text-cyan-600 text-base sm:text-lg font-bold">{price}</div>
          ))}
        </div>
      )}
      {description && (
        <p className="text-slate-700 text-xs sm:text-sm leading-relaxed font-normal mb-3">{description}</p>
      )}
      {children && <div className="w-full">{children}</div>}
      {buttonText && (
        <button
          className={`rounded-xl w-full mt-3 py-2.5 px-4 border border-transparent text-center text-sm font-semibold transition-all duration-200 shadow-md ${
            buttonDisabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
              : 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white hover:from-cyan-700 hover:to-cyan-800 hover:shadow-lg hover:scale-105 active:scale-100'
          }`}
          type="button"
          onClick={onButtonClick}
          disabled={buttonDisabled}
        >
          {buttonDisabled ? 'Access Restricted' : buttonText}
        </button>
      )}
    </div>
  );
}
