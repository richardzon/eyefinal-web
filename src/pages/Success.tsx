import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CircleCheck as CheckCircle } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { Button } from '../components/ui/Button';

export function Success() {
  const { refetch } = useSubscription();

  useEffect(() => {
    // Refetch subscription data after successful payment
    const timer = setTimeout(() => {
      refetch();
    }, 2000);

    return () => clearTimeout(timer);
  }, [refetch]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h2>
          <p className="text-gray-600 mb-6">
            Thank you for your purchase. Your subscription is now active.
          </p>
          <Link to="/">
            <Button className="w-full">
              Continue to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

