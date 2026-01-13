import React from 'react';
import './PriceTicker.css';

interface PriceTickerProps {
  price: number | null;
}

const DIGIT_HEIGHT = 50; // Corresponds to line-height and height in CSS

const PriceTicker: React.FC<PriceTickerProps> = ({ price }) => {
  // Handle null, undefined, or non-numeric price gracefully
  const formattedPrice = (price !== null && typeof price === 'number')
    ? `$${price.toFixed(2)}`
    : ''; // Display nothing while loading, container will collapse

  // Don't render anything if there's no price yet
  if (!formattedPrice) {
    return (
        <div className="ticker-container" style={{height: '50px'}}>
            Yükleniyor...
        </div>
    );
  }

  return (
    <div className="ticker-container">
      {formattedPrice.split('').map((char, index) => {
        // Check if the character is a digit
        if (!isNaN(parseInt(char, 10))) {
          return (
            <div key={index} className="digit-slot">
              <div className="digit-wrapper" style={{ top: `-${parseInt(char, 10) * DIGIT_HEIGHT}px` }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="digit">{i}</div>
                ))}
              </div>
            </div>
          );
        }
        // Render non-digit characters (like '$' and '.') statically
        return (
          <div key={index} className="char-slot">
            {char}
          </div>
        );
      })}
    </div>
  );
};

export default PriceTicker;