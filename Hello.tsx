import React, { useState } from 'react';

const Hello: React.FC = () => {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('World');

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-4xl font-bold mb-2">Hello {name}! 👋</h1>
        <p className="text-lg opacity-90">Welcome to your React + TypeScript application</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Interactive Counter</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCount(count - 1)}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            -
          </button>
          <span className="text-3xl font-bold text-gray-700 min-w-[60px] text-center">
            {count}
          </span>
          <button
            onClick={() => setCount(count + 1)}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            +
          </button>
          <button
            onClick={() => setCount(0)}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors ml-2"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Personalize Your Greeting</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setName('World')}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Reset Name
          </button>
        </div>
      </div>

      <div className="mt-6 text-center text-gray-600">
        <p className="text-sm">
          Built with ❤️ using React, TypeScript, and Tailwind CSS
        </p>
      </div>
    </div>
  );
};

export default Hello;
