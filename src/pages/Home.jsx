import { useState, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Real supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const Home = () => {
  const [money, setMoney] = useState(0); // Changed from counter to money
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMoneyFromDB();
  }, []);

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

  const incrementMoney = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('increment_counter', {
        counter_name: 'money',
        amount: 3  // Add this line
      });
  
      if (error) {
        console.error('Error incrementing:', error);
      } else {
        setMoney(data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };
  
  const decrementMoney = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('decrement_counter', {
        counter_name: 'money',
        amount: 3  // Add this line
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

  return (
    <div className="flex h-full w-full justify-center items-center">
      <div className="flex items-center flex-col justify-center h-full w-full space-y-20">
        <h1 className="text-7xl">${money}</h1>
        {loading && <p className="text-gray-500">Syncing...</p>}
        <div className="flex flex-col space-y-10">
          <button 
            className="bg-gray-300 px-20 py-3 border-gray-500 border-1 rounded disabled:opacity-50" 
            onClick={incrementMoney}
            disabled={loading}
          >
            Increment (+$3)
          </button>
          <button 
            className="bg-gray-600 px-20 py-3 border-gray-900 border-1 rounded text-white disabled:opacity-50" 
            onClick={decrementMoney}
            disabled={loading}
          >
            Decrement (-$3)
          </button>
          <button 
            className="bg-red-300 border-1 border-red-500 rounded px-10 py-2 disabled:opacity-50" 
            onClick={resetMoney}
            disabled={loading}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home; // Fixed export syntax