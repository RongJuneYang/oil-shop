import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { API_URL } from '../api';

function Login() {
  const navigate = useNavigate()

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/members/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          phone: phone.trim(),
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '登入失敗，請確認帳號與密碼。')
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('member', JSON.stringify(data.member))

      setPassword('')

      // 依會員身分前往不同頁面
      if (data.member.is_admin) {
        navigate('/')
      } else {
        navigate('/products')
      }
    } catch (err) {
      setError(err.message || '登入時發生錯誤，請稍後再試。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf8f3] px-6 py-12 text-stone-800">
      <section className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <Link to="/" className="text-sm text-amber-800 hover:underline">
          ← 返回首頁
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-amber-900">
          會員登入
        </h1>

        <p className="mt-3 text-sm leading-6 text-stone-500">
          登入後即可選購商品與管理訂單。
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <label className="block text-sm font-medium">
            手機號碼
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
              required
              placeholder="請輸入註冊時的手機號碼"
              className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-amber-700"
            />
          </label>

          <label className="block text-sm font-medium">
            密碼
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              placeholder="請輸入密碼"
              className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-amber-700"
            />
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-amber-800 px-4 py-3 font-semibold text-white hover:bg-amber-900 disabled:opacity-50"
          >
            {loading ? '登入中……' : '登入'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-600">
          還沒有帳號？{' '}
          <Link
            to="/register"
            className="font-semibold text-amber-800 hover:underline"
          >
            註冊會員
          </Link>
        </p>
      </section>
    </main>
  )
}

export default Login