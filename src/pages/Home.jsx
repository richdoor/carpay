import { useState, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Real supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const Home = () => {
  const [money, setMoney] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rides, setRides] = useState({});
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeSlots = ['Morning', 'Evening'];

  useEffect(() => {
    loadMoneyFromDB();
    loadRidesFromDB();
    setCurrentWeekStart(getStartOfWeek(new Date()));
  }, []);

  const getStartOfWeek = (date) => {
    const d = new Date(date);
    // Use local time instead of UTC to avoid timezone issues
    d.setHours(0, 0, 0, 0); // Set to start of day
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
    const startOfWeek = new Date(d);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0); // Ensure start of day
    return startOfWeek;
  };

  const getDateKey = (dayIndex, slot) => {
    const date = new Date(currentWeekStart);
    date.setHours(0, 0, 0, 0); // Ensure consistent time
    date.setDate(date.getDate() + dayIndex);
    // Use local date string format instead of ISO to avoid UTC conversion
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return `${dateStr}_${slot.toLowerCase()}`;
  };

  const loadMoneyFromDB = async () => {
    try {
      const { data, error } = await supabase
        .from('counters')
        .select('value')
        .eq('name', 'money')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading money:', error);
        return;
      }

      if (data) {
        setMoney(data.value);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadRidesFromDB = async (weekStart = null) => {
    try {
      const targetWeek = weekStart || currentWeekStart;
      const startDate = new Date(targetWeek);
      startDate.setHours(0, 0, 0, 0); // Ensure start of day
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999); // Ensure end of day

      // Use local date strings instead of ISO to avoid UTC conversion
      const formatLocalDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .gte('date', formatLocalDate(startDate))
        .lte('date', formatLocalDate(endDate));

      if (error) {
        console.error('Error loading rides:', error);
        return;
      }

      const ridesMap = {};
      data?.forEach(ride => {
        const key = `${ride.date}_${ride.time_slot}`;
        ridesMap[key] = ride.rides;
      });
      
      // Merge with existing rides instead of replacing
      setRides(prev => ({
        ...prev,
        ...ridesMap
      }));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const toggleRide = async (dayIndex, slot) => {
    const date = new Date(currentWeekStart);
    date.setHours(0, 0, 0, 0); // Ensure consistent time
    date.setDate(date.getDate() + dayIndex);
    // Use local date string format instead of ISO to avoid UTC conversion
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const key = getDateKey(dayIndex, slot);
    const currentRides = rides[key] || 0;
    const newRides = currentRides === 0 ? 1 : 0;

    try {
      if (newRides === 0) {
        // Delete the ride record
        const { error } = await supabase
          .from('rides')
          .delete()
          .eq('date', dateStr)
          .eq('time_slot', slot.toLowerCase());

        if (error) {
          console.error('Error removing ride:', error);
          return { success: false, action: 'remove' };
        }
      } else {
        // Add the ride record
        const { error } = await supabase
          .from('rides')
          .upsert({
            date: dateStr,
            time_slot: slot.toLowerCase(),
            rides: 1
          }, {
            onConflict: 'date,time_slot'
          });

        if (error) {
          console.error('Error adding ride:', error);
          return { success: false, action: 'add' };
        }
      }

      setRides(prev => ({
        ...prev,
        [key]: newRides
      }));
      
      return { success: true, action: newRides === 0 ? 'remove' : 'add' };
    } catch (error) {
      console.error('Error:', error);
      return { success: false, action: newRides === 0 ? 'remove' : 'add' };
    }
  };

  const handleRideClick = async (dayIndex, slot) => {
    setLoading(true);
    try {
      const result = await toggleRide(dayIndex, slot);
      
      if (result.success) {
        if (result.action === 'add') {
          // Add money when adding a ride
          const { data, error } = await supabase.rpc('increment_counter', {
            counter_name: 'money',
            amount: 3
          });
          
          if (error) {
            console.error('Error incrementing money:', error);
          } else {
            setMoney(data);
          }
        } else {
          // Remove money when removing a ride
          const { data, error } = await supabase.rpc('decrement_counter', {
            counter_name: 'money',
            amount: 3
          });
          
          if (error) {
            console.error('Error decrementing money:', error);
          } else {
            setMoney(data);
          }
        }
      }
    } catch (error) {
      console.error('Error handling ride click:', error);
    }
    setLoading(false);
  };
  
  const decrementMoney = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('decrement_counter', {
        counter_name: 'money',
        amount: 3
      });
  
      if (error) {
        console.error('Error decrementing:', error);
      } else {
        setMoney(data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const resetMoney = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('counters')
        .update({ value: 0, updated_at: new Date() })
        .eq('name', 'money')
        .select('value')
        .single();

      if (error) {
        console.error('Error resetting:', error);
      } else {
        setMoney(0);
      }
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const formatDate = (dayIndex) => {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + dayIndex);
    return date.getDate();
  };

  const navigateWeek = async (direction) => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() + (direction * 7));
    setCurrentWeekStart(newWeekStart);
    // Load rides for the new week and merge with existing data
    await loadRidesFromDB(newWeekStart);
  };

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto p-4 space-y-6">
      {/* Money Display */}
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold">${money}</h1>
        {loading && <p className="text-gray-500">Syncing...</p>}
      </div>

      {/* Week Navigation */}
      <div className="flex justify-between items-center">
        <button 
          onClick={() => navigateWeek(-1)}
          className="bg-gray-200 px-3 py-1 rounded text-sm"
        >
          ← Prev
        </button>
        <h2 className="text-lg font-semibold">
          Week of {currentWeekStart.toLocaleDateString()}
        </h2>
        <button 
          onClick={() => navigateWeek(1)}
          className="bg-gray-200 px-3 py-1 rounded text-sm"
        >
          Next →
        </button>
      </div>

      {/* Calendar */}
      <div className="space-y-1">
        {days.map((day, dayIndex) => (
          <div key={day} className="bg-gray-50 rounded-lg p-3">
            <h3 className="font-medium text-sm mb-2">
              {day} {formatDate(dayIndex)}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {timeSlots.map(slot => {
                const key = getDateKey(dayIndex, slot);
                const rideCount = rides[key] || 0;
                return (
                  <button
                    key={slot}
                    onClick={() => handleRideClick(dayIndex, slot)}
                    disabled={loading}
                    className={`border border-gray-200 rounded p-2 text-center disabled:opacity-50 active:scale-95 transition-all duration-150 ${
                      rideCount > 0 
                        ? 'bg-green-400 text-white border-green-500' 
                        : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-xs mb-1 opacity-75">{slot}</div>
                    <div className="text-sm font-medium">
                      {rideCount > 0 ? 'Ride taken' : 'Add ride'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-col space-y-3">
        <button 
          className="bg-red-400 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50" 
          onClick={decrementMoney}
          disabled={loading}
        >
          Remove $3
        </button>
        <button 
          className="bg-gray-300 border border-gray-400 rounded px-4 py-2 text-sm disabled:opacity-50" 
          onClick={resetMoney}
          disabled={loading}
        >
          Reset All
        </button>
      </div>
    </div>
  );
};

export default Home;