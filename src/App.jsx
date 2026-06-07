import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const WeatherApp = () => {
  // State Management
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('weather_api_key') || '';
  });
  const [city, setCity] = useState('London');
  const [searchInput, setSearchInput] = useState('London');
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [aqiData, setAqiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(!localStorage.getItem('weather_api_key'));
  const [isCelsius, setIsCelsius] = useState(true);
  const [activeTab, setActiveTab] = useState('current');
  const [savedCities, setSavedCities] = useState(() => {
    const saved = localStorage.getItem('saved_cities');
    return saved ? JSON.parse(saved) : ['New York', 'London', 'Tokyo', 'Paris', 'Dubai'];
  });
  const [showCityManager, setShowCityManager] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [multipleWeatherData, setMultipleWeatherData] = useState({});
  const [unit, setUnit] = useState('metric');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Save to localStorage
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('weather_api_key', apiKey);
      setShowKeyInput(false);
    }
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('saved_cities', JSON.stringify(savedCities));
  }, [savedCities]);

  // Copy demo key function
  const copyDemoKey = () => {
    const demoKey = "41560e2ddf4a606f563e2db63913af1b";
    navigator.clipboard.writeText(demoKey);
    alert("✅ Demo API Key copied! Paste it in the input field above and click Save.");
  };

  // Fetch all weather data
  const fetchWeatherData = async (cityName) => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&units=${unit}&appid=${apiKey}`
      );
      
      if (!response.ok) throw new Error('City not found');
      
      const data = await response.json();
      return {
        city: data.name,
        country: data.sys.country,
        temp: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        tempMin: Math.round(data.main.temp_min),
        tempMax: Math.round(data.main.temp_max),
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: data.wind.speed,
        description: data.weather[0].description,
        mainCondition: data.weather[0].main,
        iconCode: data.weather[0].icon,
        sunrise: data.sys.sunrise,
        sunset: data.sys.sunset,
        timezone: data.timezone,
        lat: data.coord.lat,
        lon: data.coord.lon,
      };
    } catch (err) {
      throw err;
    }
  };

  const fetchForecastData = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${unit}&appid=${apiKey}`
      );
      
      if (!response.ok) throw new Error('Forecast not available');
      
      const data = await response.json();
      const dailyForecasts = data.list.filter((item, index) => index % 8 === 0).slice(0, 5);
      return dailyForecasts.map(forecast => ({
        date: new Date(forecast.dt * 1000),
        temp: Math.round(forecast.main.temp),
        tempMin: Math.round(forecast.main.temp_min),
        tempMax: Math.round(forecast.main.temp_max),
        humidity: forecast.main.humidity,
        description: forecast.weather[0].description,
        mainCondition: forecast.weather[0].main,
        iconCode: forecast.weather[0].icon,
        windSpeed: forecast.wind.speed,
        pop: Math.round(forecast.pop * 100),
      }));
    } catch (err) {
      throw err;
    }
  };

  const fetchAQIData = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`
      );
      
      if (!response.ok) throw new Error('AQI not available');
      
      const data = await response.json();
      const aqi = data.list[0].main.aqi;
      const components = data.list[0].components;
      
      const getAQILevel = (aqiValue) => {
        switch(aqiValue) {
          case 1: return { level: 'Good', color: '#00e400', icon: '😊', advice: 'Great day to be outside!' };
          case 2: return { level: 'Fair', color: '#ffff00', icon: '😐', advice: 'Sensitive groups should limit outdoor activity' };
          case 3: return { level: 'Moderate', color: '#ff7e00', icon: '😷', advice: 'Consider reducing outdoor activities' };
          case 4: return { level: 'Poor', color: '#ff0000', icon: '⚠️', advice: 'Wear mask if going outside' };
          case 5: return { level: 'Very Poor', color: '#99004c', icon: '🚫', advice: 'Stay indoors if possible' };
          default: return { level: 'Unknown', color: '#999', icon: '❓', advice: 'Data not available' };
        }
      };
      
      return {
        aqi: aqi,
        ...getAQILevel(aqi),
        components: {
          pm2_5: Math.round(components.pm2_5),
          pm10: Math.round(components.pm10),
          no2: Math.round(components.no2),
          o3: Math.round(components.o3),
          so2: Math.round(components.so2),
          co: Math.round(components.co),
        }
      };
    } catch (err) {
      throw err;
    }
  };

  const fetchWeather = async (cityName) => {
    if (!cityName.trim()) {
      setError('Please enter a city name');
      return;
    }

    if (!apiKey) {
      setError('⚠️ API Key required');
      setShowKeyInput(true);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await fetchWeatherData(cityName);
      setWeatherData(data);
      setCity(data.city);
      setSearchInput(data.city);
      setLastUpdated(new Date());
      
      const [forecast, aqi] = await Promise.all([
        fetchForecastData(data.lat, data.lon),
        fetchAQIData(data.lat, data.lon)
      ]);
      setForecastData(forecast);
      setAqiData(aqi);
    } catch (err) {
      setError(err.message);
      setWeatherData(null);
      setForecastData(null);
      setAqiData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCitiesWeather = async () => {
    const weatherPromises = savedCities.map(cityName => 
      fetchWeatherData(cityName).catch(err => ({ error: true, city: cityName }))
    );
    
    const results = await Promise.all(weatherPromises);
    const weatherMap = {};
    results.forEach((result, index) => {
      if (result && !result.error) {
        weatherMap[savedCities[index]] = result;
      }
    });
    setMultipleWeatherData(weatherMap);
  };

  useEffect(() => {
    if (apiKey && savedCities.length > 0) {
      fetchAllCitiesWeather();
    }
  }, [apiKey, unit]);

  useEffect(() => {
    if (apiKey && !weatherData) {
      fetchWeather(savedCities[0] || 'New York');
    }
  }, [apiKey]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchWeather(searchInput.trim());
    }
  };

  const saveApiKey = (e) => {
    e.preventDefault();
    const newKey = e.target.elements.apiKeyInput.value.trim();
    if (newKey) {
      setApiKey(newKey);
    }
  };

  const clearApiKey = () => {
    setApiKey('');
    localStorage.removeItem('weather_api_key');
    setWeatherData(null);
    setForecastData(null);
    setAqiData(null);
    setShowKeyInput(true);
    setError('');
    setMultipleWeatherData({});
  };

  const addCity = () => {
    if (newCityName.trim() && !savedCities.includes(newCityName.trim())) {
      const updatedCities = [...savedCities, newCityName.trim()];
      setSavedCities(updatedCities);
      setNewCityName('');
      setError('');
    } else if (savedCities.includes(newCityName.trim())) {
      setError('City already in your list!');
      setTimeout(() => setError(''), 2000);
    }
  };

  const removeCity = (cityToRemove) => {
    const updatedCities = savedCities.filter(c => c !== cityToRemove);
    setSavedCities(updatedCities);
    const updatedWeather = { ...multipleWeatherData };
    delete updatedWeather[cityToRemove];
    setMultipleWeatherData(updatedWeather);
  };

  const selectCity = (cityName) => {
    setSearchInput(cityName);
    fetchWeather(cityName);
    setShowCityManager(false);
  };

  const toggleUnit = () => {
    setUnit(unit === 'metric' ? 'imperial' : 'metric');
    setIsCelsius(!isCelsius);
    if (weatherData) {
      fetchWeather(weatherData.city);
    }
  };

  const isNightTime = () => {
    if (!weatherData) return false;
    const currentTime = Math.floor(Date.now() / 1000);
    return currentTime > weatherData.sunset || currentTime < weatherData.sunrise;
  };

  const getDynamicBackground = () => {
    if (!weatherData) return 'default';
    const night = isNightTime();
    const condition = weatherData.mainCondition.toLowerCase();
    if (night) return 'night';
    if (condition.includes('clear')) return 'sunny';
    if (condition.includes('rain') || condition.includes('drizzle')) return 'rainy';
    if (condition.includes('cloud')) return 'cloudy';
    if (condition.includes('snow')) return 'snowy';
    if (condition.includes('thunder')) return 'stormy';
    return 'default';
  };

  const getWeatherEffects = () => {
    if (!weatherData) return null;
    const condition = weatherData.mainCondition.toLowerCase();
    if (condition.includes('rain') || condition.includes('drizzle')) return 'rain';
    if (condition.includes('snow')) return 'snow';
    if (condition.includes('cloud')) return 'clouds';
    return null;
  };

  const getWeatherImage = (condition) => {
    const map = { Clear: '☀️', Clouds: '☁️', Rain: '🌧️', Drizzle: '🌦️', Thunderstorm: '⛈️', Snow: '❄️', Mist: '🌫️' };
    return map[condition] || '🌡️';
  };

  const formatTime = (timestamp, timezoneOffset) => {
    if (!timestamp) return '--:--';
    const date = new Date((timestamp + timezoneOffset) * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getTempUnit = () => unit === 'metric' ? '°C' : '°F';
  const getSpeedUnit = () => unit === 'metric' ? 'm/s' : 'mph';

  const weatherEffect = getWeatherEffects();
  const backgroundType = getDynamicBackground();

  // Temperature Chart Component
  const TemperatureChart = () => {
    if (!forecastData) return null;
    const maxTemp = Math.max(...forecastData.map(f => f.tempMax));
    const minTemp = Math.min(...forecastData.map(f => f.tempMin));
    const range = maxTemp - minTemp || 1;
    
    return (
      <div className="temp-chart">
        <h4>📈 Temperature Trend (5 Days)</h4>
        <div className="chart-container">
          {forecastData.map((day, index) => {
            const heightMax = ((day.tempMax - minTemp) / range) * 100;
            const heightMin = ((day.tempMin - minTemp) / range) * 100;
            return (
              <div key={index} className="chart-bar">
                <div className="bar-labels">
                  <span className="temp-max">{day.tempMax}°</span>
                  <span className="temp-min">{day.tempMin}°</span>
                </div>
                <div className="bar-container">
                  <div className="bar-max" style={{ height: `${heightMax}%` }}></div>
                  <div className="bar-min" style={{ height: `${heightMin}%` }}></div>
                </div>
                <div className="bar-date">{formatDate(day.date).split(' ')[0]}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`app-container ${backgroundType}`}>
      {/* Weather Effects */}
      {weatherEffect === 'rain' && (
        <div className="rain-effect">
          {[...Array(80)].map((_, i) => (
            <div key={i} className="rain-drop" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s`, animationDuration: `${0.5 + Math.random() * 0.5}s` }}></div>
          ))}
        </div>
      )}
      {weatherEffect === 'snow' && (
        <div className="snow-effect">
          {[...Array(60)].map((_, i) => (
            <div key={i} className="snowflake" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 5}s`, animationDuration: `${3 + Math.random() * 2}s` }}>❄️</div>
          ))}
        </div>
      )}
      {weatherEffect === 'clouds' && (
        <div className="clouds-effect">
          <div className="cloud cloud1">☁️</div>
          <div className="cloud cloud2">☁️</div>
          <div className="cloud cloud3">☁️</div>
          <div className="cloud cloud4">☁️</div>
        </div>
      )}

      {/* API Key Section with Demo Key */}
      {showKeyInput && (
        <div className="api-key-section">
          <div className="key-card">
            <h3>🔑 Weather API Key</h3>
            <form onSubmit={saveApiKey}>
              <input 
                type="text" 
                name="apiKeyInput" 
                placeholder="Enter OpenWeatherMap API key" 
                className="api-input" 
                required 
              />
              <button type="submit" className="save-btn">Save Key</button>
            </form>
            
            <p className="info-text">
              Get free key from{' '}
              <a href="https://home.openweathermap.org/users/sign_up" target="_blank" rel="noopener noreferrer">
                OpenWeatherMap
              </a>
            </p>
            
            {/* Demo API Key Line */}
            <div className="demo-key-container">
              <div className="demo-divider">
                <span className="demo-divider-text">OR TRY DEMO KEY</span>
              </div>
              <div className="demo-key-text">
                <strong>📋 Demo API Key:</strong>
                <br />
                <code className="demo-key-code" onClick={copyDemoKey}>
                  41560e2ddf4a606f563e2db63913af1b
                </code>
              </div>
              <p className="demo-note">
                ⚡ Click the key to copy → Paste above → Save → Start using the app!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main App */}
      {!showKeyInput && (
        <div className="weather-app">
          {/* Header */}
          <div className="app-header">
            <div className="logo"><span className="logo-icon">🌤️</span><h1>Weather</h1></div>
            <div className="header-actions">
              <button onClick={() => setShowCityManager(!showCityManager)} className="cities-btn">📍 {savedCities.length}</button>
              <button onClick={toggleUnit} className="temp-toggle">{getTempUnit()}</button>
              <button onClick={clearApiKey} className="change-key-btn">🔑</button>
            </div>
          </div>

          {/* City Manager */}
          {showCityManager && (
            <div className="city-manager">
              <h3>My Cities</h3>
              <div className="add-city-form">
                <input type="text" value={newCityName} onChange={(e) => setNewCityName(e.target.value)} placeholder="Add city..." className="add-city-input" />
                <button onClick={addCity} className="add-city-btn">+ Add</button>
              </div>
              <div className="cities-list">
                {savedCities.map((cityName, index) => (
                  <div key={index} className="city-item">
                    <button onClick={() => selectCity(cityName)} className="city-select-btn"><span>🌆</span><span>{cityName}</span></button>
                    <button onClick={() => removeCity(cityName)} className="remove-city-btn">✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-wrapper">
              <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search city..." className="city-input" />
              <button type="submit" className="search-btn">🔍</button>
            </div>
          </form>

          {/* Tabs */}
          <div className="tab-navigation">
            <button className={`tab-btn ${activeTab === 'current' ? 'active' : ''}`} onClick={() => setActiveTab('current')}>☁️ Current</button>
            <button className={`tab-btn ${activeTab === 'forecast' ? 'active' : ''}`} onClick={() => setActiveTab('forecast')}>📅 5-Day</button>
            <button className={`tab-btn ${activeTab === 'aqi' ? 'active' : ''}`} onClick={() => setActiveTab('aqi')}>🌫️ Air Quality</button>
          </div>

          {/* Loading & Error */}
          {loading && <div className="loading"><div className="spinner"></div><p>Loading weather...</p></div>}
          {error && !loading && <div className="error-message">⚠️ {error}</div>}

          {/* Current Weather */}
          {activeTab === 'current' && weatherData && !loading && (
            <div className="weather-card">
              <div className="weather-icon">
                <div className="icon-animation">{getWeatherImage(weatherData.mainCondition)}</div>
                <img src={`https://openweathermap.org/img/wn/${weatherData.iconCode}@4x.png`} alt={weatherData.description} className="owm-icon" />
              </div>
              <div className="temperature-section">
                <div className="main-temp">
                  <span className="temp-value">{weatherData.temp}°</span>
                </div>
                <p className="description">{weatherData.description}</p>
              </div>
              <div className="city-section">
                <h2 className="city-name">{weatherData.city}, {weatherData.country}</h2>
              </div>
              <div className="details-grid">
                <div className="detail-card"><span className="detail-icon">🌡️</span><span className="detail-label">Feels Like</span><span className="detail-value">{weatherData.feelsLike}°</span></div>
                <div className="detail-card"><span className="detail-icon">💧</span><span className="detail-label">Humidity</span><span className="detail-value">{weatherData.humidity}%</span></div>
                <div className="detail-card"><span className="detail-icon">💨</span><span className="detail-label">Wind</span><span className="detail-value">{weatherData.windSpeed} {getSpeedUnit()}</span></div>
                <div className="detail-card"><span className="detail-icon">📊</span><span className="detail-label">Pressure</span><span className="detail-value">{weatherData.pressure} hPa</span></div>
                <div className="detail-card"><span className="detail-icon">📈</span><span className="detail-label">Min/Max</span><span className="detail-value">{weatherData.tempMin}°/{weatherData.tempMax}°</span></div>
                <div className="detail-card"><span className="detail-icon">🌅</span><span className="detail-label">Sunrise/Sunset</span><span className="detail-value">{formatTime(weatherData.sunrise, weatherData.timezone)}/{formatTime(weatherData.sunset, weatherData.timezone)}</span></div>
              </div>
              {lastUpdated && <div className="last-updated">Last updated: {lastUpdated.toLocaleTimeString()}</div>}
            </div>
          )}

          {/* Forecast */}
          {activeTab === 'forecast' && forecastData && !loading && (
            <div className="forecast-container">
              <TemperatureChart />
              <div className="forecast-list">
                {forecastData.map((day, index) => (
                  <div key={index} className="forecast-card">
                    <div className="forecast-date">{formatDate(day.date)}</div>
                    <img src={`https://openweathermap.org/img/wn/${day.iconCode}@2x.png`} alt={day.description} className="forecast-icon" />
                    <div className="forecast-temp"><span className="forecast-max">{day.tempMax}°</span><span className="forecast-min">{day.tempMin}°</span></div>
                    <div className="forecast-desc">{day.description}</div>
                    <div className="forecast-details"><span>💧 {day.humidity}%</span><span>💨 {day.windSpeed} {getSpeedUnit()}</span></div>
                    {day.pop > 0 && <div className="rain-chance">🌧️ Rain chance: {day.pop}%</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AQI */}
          {activeTab === 'aqi' && aqiData && !loading && (
            <div className="aqi-container">
              <div className="aqi-main" style={{ borderColor: aqiData.color }}>
                <div className="aqi-value" style={{ color: aqiData.color }}>{aqiData.aqi}</div>
                <div className="aqi-level" style={{ background: aqiData.color }}>{aqiData.level} {aqiData.icon}</div>
                <div className="aqi-description">{aqiData.description}</div>
                <div className="aqi-advice">💡 {aqiData.advice}</div>
              </div>
              <div className="pollutants-grid">
                <div className="pollutant-card"><span className="pollutant-icon">🌫️</span><span className="pollutant-name">PM2.5</span><span className="pollutant-value">{aqiData.components.pm2_5} µg/m³</span></div>
                <div className="pollutant-card"><span className="pollutant-icon">🏭</span><span className="pollutant-name">PM10</span><span className="pollutant-value">{aqiData.components.pm10} µg/m³</span></div>
                <div className="pollutant-card"><span className="pollutant-icon">🚗</span><span className="pollutant-name">NO₂</span><span className="pollutant-value">{aqiData.components.no2} µg/m³</span></div>
                <div className="pollutant-card"><span className="pollutant-icon">🌿</span><span className="pollutant-name">O₃</span><span className="pollutant-value">{aqiData.components.o3} µg/m³</span></div>
                <div className="pollutant-card"><span className="pollutant-icon">🏭</span><span className="pollutant-name">SO₂</span><span className="pollutant-value">{aqiData.components.so2} µg/m³</span></div>
                <div className="pollutant-card"><span className="pollutant-icon">🚘</span><span className="pollutant-name">CO</span><span className="pollutant-value">{aqiData.components.co} µg/m³</span></div>
              </div>
            </div>
          )}

          {/* Quick Access */}
          {savedCities.length > 0 && (
            <div className="quick-cities-bar">
              <p className="quick-label">⚡ Quick Access</p>
              <div className="quick-cities-list">
                {savedCities.map((cityName, index) => (
                  <button key={index} onClick={() => selectCity(cityName)} className="quick-city-btn">
                    {cityName}{multipleWeatherData[cityName] && <span className="quick-temp">{multipleWeatherData[cityName].temp}°</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WeatherApp;
