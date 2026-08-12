import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import '../styles/login.scss';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(typeof payload?.message === 'string' ? payload.message : 'Unable to log in');
      }

      sessionStorage.setItem('authenticatedUser', JSON.stringify(payload));
      navigate('/table');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to log in');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className='app login-page'>
      <h1>Log in</h1>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Email
          <input type='email' value={email} onChange={(event) => setEmail(event.target.value)} autoComplete='email' required />
        </label>
        <label>
          Password
          <input type='password' value={password} onChange={(event) => setPassword(event.target.value)} autoComplete='current-password' required />
        </label>
        {error && <p role='alert'>{error}</p>}
        <button type='submit' disabled={isSubmitting}>{isSubmitting ? 'Logging in...' : 'Log in'}</button>
      </form>
    </main>
  );
}
