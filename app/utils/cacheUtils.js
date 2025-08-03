// Cache utility functions
export const getCachedData = (zipCode) => {
  if (typeof window === 'undefined') return null;
  
  try {
    const cacheKey = `gardenWatering_${zipCode}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      const data = JSON.parse(cached);
      const now = new Date().getTime();
      const cacheAge = now - data.timestamp;
      const twelveHours = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
      
      if (cacheAge < twelveHours) {
        return {
          weather: data.weather,
          advice: data.advice,
          todayAdvice: data.todayAdvice
        };
      } else {
        // Cache expired, remove it
        localStorage.removeItem(cacheKey);
      }
    }
  } catch (error) {
    console.error('Error reading cache:', error);
  }
  
  return null;
};

export const setCachedData = (zipCode, weather, advice, todayAdvice) => {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheKey = `gardenWatering_${zipCode}`;
    const cacheData = {
      timestamp: new Date().getTime(),
      weather,
      advice,
      todayAdvice
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    localStorage.setItem('gardenWateringZipCode', zipCode);
  } catch (error) {
    console.error('Error setting cache:', error);
  }
};