'use client';

import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Image from 'next/image';

export default function LoginPage() {
  const handleGoogleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/google`;
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    toast.error('Please use Google login');
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] border border-gray-200 rounded-xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-8">Login</h1>
        
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-md py-2.5 font-medium transition-colors"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          Login with Google
        </button>

        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-gray-200"></div>
          <span className="px-3 text-sm text-gray-500">or sign up through email</span>
          <div className="flex-1 border-t border-gray-200"></div>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <Input type="email" placeholder="Email ID" />
          <Input type="password" placeholder="Password" />
          <Button type="submit" className="w-full mt-2">
            Login
          </Button>
        </form>
      </div>
    </div>
  );
}
