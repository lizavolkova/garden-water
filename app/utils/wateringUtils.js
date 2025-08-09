// Temperature utility functions
export const convertFahrenheitToCelsius = (fahrenheit) => {
  return (fahrenheit - 32) * 5 / 9;
};

export const convertCelsiusToFahrenheit = (celsius) => {
  return (celsius * 9 / 5) + 32;
};

export const formatTemperature = (temp, unit) => {
  return unit === 'celsius' ? 
    `${Math.round(convertFahrenheitToCelsius(temp))}°C` : 
    `${Math.round(temp)}°F`;
};

// Weather icon mapping - returns custom icon paths
export const getWeatherIcon = (description, temp_max) => {
  const desc = description.toLowerCase();
  
  if (desc.includes('rain') || desc.includes('shower') || desc.includes('drizzle')) {
    return '/weather-icons/rain.png';
  } else if (desc.includes('snow') || desc.includes('sleet')) {
    return '/weather-icons/snow.png';
  } else if (desc.includes('storm') || desc.includes('thunder')) {
    return '/weather-icons/thunderstorm.png';
  } else if (desc.includes('fog') || desc.includes('mist')) {
    return '/weather-icons/fog.png';
  } else if (desc.includes('wind')) {
    return '/weather-icons/wind.png';
  } else if (desc.includes('cloud') || desc.includes('overcast')) {
    return '/weather-icons/cloudy.png';
  } else if (desc.includes('partly') || (desc.includes('cloud') && (desc.includes('sun') || desc.includes('clear')))) {
    return '/weather-icons/partly-cloudy.png';
  } else if (desc.includes('clear') || desc.includes('sunny')) {
    return '/weather-icons/sunny.png';
  }
  
  // Default fallback
  return temp_max > 75 ? '/weather-icons/sunny.png' : '/weather-icons/partly-cloudy.png';
};

// Legacy emoji weather icon mapping (for fallback)
export const getWeatherIconEmoji = (description, temp_max) => {
  const desc = description.toLowerCase();
  
  if (desc.includes('rain') || desc.includes('shower') || desc.includes('drizzle')) {
    return '🌧️';
  } else if (desc.includes('snow') || desc.includes('sleet')) {
    return '❄️';
  } else if (desc.includes('cloud') || desc.includes('overcast')) {
    return temp_max > 75 ? '⛅' : '☁️';
  } else if (desc.includes('clear') || desc.includes('sunny')) {
    return temp_max > 80 ? '☀️' : '🌤️';
  } else if (desc.includes('storm') || desc.includes('thunder')) {
    return '⛈️';
  } else if (desc.includes('fog') || desc.includes('mist')) {
    return '🌫️';
  } else if (desc.includes('wind')) {
    return '💨';
  }
  
  return temp_max > 75 ? '☀️' : '⛅';
};

// Unified function to get watering decision info for both mobile and desktop
export const getWateringDecision = (day, isPast, debugMode) => {
  let actionText = '';
  let actionColor = '#6B7B5C';
  let weatherIcon = '☀️';
  let decisionBg = '#F6F9F4';
  
  if (debugMode) {
    actionText = day.description;
    if (day.description.includes('rain')) weatherIcon = '🌧️';
    else if (day.description.includes('cloud')) weatherIcon = '☁️';
    else if (day.description.includes('sun')) weatherIcon = '☀️';
  } else {
    // Get watering status
    let status = 'no';
    if (day.wateringStatus) {
      status = day.wateringStatus;
    } else if (day.shouldWater) {
      status = day.priority === 'high' ? 'yes' : 'maybe';
    }
    
    switch (status) {
      case 'yes':
        actionText = 'Water';
        actionColor = '#1976D2';
        weatherIcon = '💧';
        decisionBg = '#E3F2FD';
        break;
      case 'maybe':
        actionText = 'Check';
        actionColor = '#F57C00';
        weatherIcon = '🌱';
        decisionBg = '#FFF3E0';
        break;
      default:
        actionText = 'Skip';
        actionColor = '#2E7D32';
        weatherIcon = '🚫';
        decisionBg = '#E8F5E8';
    }
    
    if (isPast) {
      actionText = 'Past';
      actionColor = '#9E9E9E';
    }
  }
  
  return { actionText, actionColor, weatherIcon, decisionBg };
};

// Create faded background colors for accuracy visualization
export const getFadedColor = (baseColor, factor) => {
  if (factor >= 1) return baseColor;
  // Convert hex to RGB, then blend with white
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const newR = Math.round(r + (255 - r) * (1 - factor));
  const newG = Math.round(g + (255 - g) * (1 - factor));
  const newB = Math.round(b + (255 - b) * (1 - factor));
  
  return `rgb(${newR}, ${newG}, ${newB})`;
};

// Calculate fade factor based on days from today
export const calculateFadeFactor = (index, todayIndex, totalDays, isPast, debugMode) => {
  let fadeFactor = 1;
  if (!debugMode && !isPast && todayIndex >= 0) {
    const daysFromToday = index - todayIndex;
    const maxDaysOut = totalDays - todayIndex - 1;
    if (maxDaysOut > 0) {
      fadeFactor = Math.max(0.1, 1 - (daysFromToday / maxDaysOut) * 0.9);
    }
  } else if (!debugMode && isPast) {
    fadeFactor = 0.3; // Keep past days very faded
  }
  return fadeFactor;
};