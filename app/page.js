"use client";

// pages/index.js
import { useState } from 'react';
import Head from 'next/head';

export default function Home() {
  const [zipCode, setZipCode] = useState('10562');
  const [weatherData, setWeatherData] = useState(null);
  const [wateringAdvice, setWateringAdvice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWeatherAndAdvice = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/weather-advice?zipCode=${zipCode}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch weather data');
      }
      
      setWeatherData(data.weather);
      setWateringAdvice(data.advice);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };

  const getWateringIcon = (shouldWater) => {
    return shouldWater ? '💧' : '🚫';
  };

  return (
    <>
      <Head>
        <title>Garden Watering Assistant</title>
        <meta name="description" content="AI-powered garden watering recommendations based on weather forecast" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-green-800 mb-2">
              🌱 Garden Watering Assistant
            </h1>
            <p className="text-lg text-gray-600">
              AI-powered watering recommendations for your vegetable garden
            </p>
          </header>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  id="zipCode"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter your ZIP code"
                />
              </div>
              <button
                onClick={fetchWeatherAndAdvice}
                disabled={loading || !zipCode}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Analyzing...' : 'Get Watering Advice'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <span className="text-red-500 mr-2">⚠️</span>
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {wateringAdvice && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-semibold text-green-800 mb-4">
                🤖 AI Watering Recommendations
              </h2>
              <div className="bg-green-50 rounded-lg p-4 mb-4">
                <p className="text-green-800 font-medium">{wateringAdvice.weekSummary}</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 rounded-lg">
                  <thead>
                    <tr className="bg-green-100">
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-green-800">Date</th>
                      <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-green-800">Water?</th>
                      <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-green-800">Amount</th>
                      <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-green-800">Priority</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-green-800">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wateringAdvice.dailyRecommendations?.map((day, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-4 py-3 font-medium">
                          {formatDate(day.date)}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                            day.shouldWater 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {day.shouldWater ? '💧 Yes' : '🚫 No'}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                            day.wateringAmount === 'heavy' ? 'bg-blue-200 text-blue-900' :
                            day.wateringAmount === 'moderate' ? 'bg-blue-100 text-blue-800' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {day.wateringAmount || 'N/A'}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                            day.priority === 'high' ? 'bg-red-100 text-red-800' :
                            day.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {day.priority || 'low'}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                          {day.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {weatherData && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                🌤️ 5-Day Weather Forecast
              </h2>
              <div className="grid gap-3">
                {weatherData.map((day, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium">{formatDate(day.date)}</span>
                      <p className="text-sm text-gray-600">{day.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{Math.round(day.temp_max)}°F / {Math.round(day.temp_min)}°F</div>
                      <div className="text-sm text-gray-500">
                        Humidity: {day.humidity}%
                      </div>
                      {day.rain > 0 && (
                        <div className="text-sm text-blue-600">
                          Rain: {day.rain.toFixed(2)}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
