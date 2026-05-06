import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import '../styles/Auth.css'

function Login({ setShowSignUp }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const getAuthErrorMessage = (code) => {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Incorrect email or password.'
      case 'auth/invalid-email':
        return 'Please enter a valid email address.'
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please wait a moment and try again.'
      default:
        return 'Unable to log in right now. Please try again.'
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const trimmedEmail = email.trim()
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password)
      const uid = userCredential.user.uid

      // Verify the user is a registered barista
      const scheduleUserDoc = await getDoc(doc(db, 'scheduleUsers', uid))
      if (!scheduleUserDoc.exists()) {
        // Try to auto-link by matching email in baristas collection
        const baristaQuery = query(
          collection(db, 'baristas'),
          where('email', '==', trimmedEmail)
        )
        const baristaSnap = await getDocs(baristaQuery)
        if (baristaSnap.empty) {
          await auth.signOut()
          setError('Your account is not linked to a barista profile. Please sign up first.')
          return
        }
        const baristaDoc = baristaSnap.docs[0]
        const barista = baristaDoc.data()
        // Auto-create the scheduleUsers doc and update the barista's uid
        await setDoc(doc(db, 'scheduleUsers', uid), {
          uid,
          baristaId: baristaDoc.id,
          baristaName: barista.name,
          email: trimmedEmail,
          createdAt: serverTimestamp(),
        })
        await updateDoc(doc(db, 'baristas', baristaDoc.id), { uid, linkedAt: serverTimestamp() })
      }
      // onAuthStateChanged in App.jsx will handle the rest
    } catch (err) {
      setError(getAuthErrorMessage(err.code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">☕</div>
        <h1>BRB Coffee</h1>
        <h2>Shift Schedule</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in…' : 'Log In'}
          </button>
        </form>
        <p className="auth-switch">
          New barista?{' '}
          <button type="button" className="link-btn" onClick={() => setShowSignUp(true)}>
            Set up your account
          </button>
        </p>
      </div>
    </div>
  )
}

export default Login
