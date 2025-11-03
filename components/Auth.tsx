
import React, { useState } from 'react';
import { SparklesIcon } from './IconComponents';

interface AuthProps {
    onAuthSuccess: (name: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
    const [name, setName] = useState('');
    const [isRegister, setIsRegister] = useState(true);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onAuthSuccess(name.trim());
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="bg-[#1e1f20] p-8 rounded-2xl shadow-2xl w-full max-w-md text-gray-200">
                <div className="text-center mb-8">
                    <SparklesIcon className="h-12 w-12 mx-auto text-blue-400 mb-2" />
                    <h1 className="text-3xl font-bold">Welcome to GalyaGPT</h1>
                    <p className="text-gray-400 mt-2">{isRegister ? "Create an account to start" : "Sign in to your account"}</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-2">Name</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-[#353739] border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your name"
                            required
                        />
                    </div>

                    {isRegister && (
                         <div className="mb-4">
                            <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                            <input
                                id="email"
                                type="email"
                                className="w-full bg-[#353739] border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter your email"
                                required
                            />
                        </div>
                    )}

                    <div className="mb-6">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                        <input
                            id="password"
                            type="password"
                            className="w-full bg-[#353739] border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="********"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300"
                    >
                        {isRegister ? "Register" : "Sign In"}
                    </button>
                </form>

                <div className="text-center mt-6">
                    <button onClick={() => setIsRegister(!isRegister)} className="text-sm text-blue-400 hover:underline">
                        {isRegister ? "Already have an account? Sign In" : "Don't have an account? Register"}
                    </button>
                </div>
            </div>
        </div>
    );
};
