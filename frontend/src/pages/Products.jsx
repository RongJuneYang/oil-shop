import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API_URL = 'http://localhost:3000/api'

function Products() {
  const navigate = useNavigate()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [member, setMember] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('member') || 'null')
    } catch {
      return null
    }
  })

  const isAdmin = member?.is_admin === true

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch(`${API_URL}/products`)

        if (!response.ok) {
          throw new Error('無法取得商品資料')
        }

        const data = await response.json()
        const list = Array.isArray(data) ? data : data.products

        if (!Array.isArray(list)) {
          throw new Error('商品 API 回傳格式不正確')
        }

        setProducts(list)
      } catch (err) {
        setError(err.message || '載入商品失敗')
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [])

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('member')
    setMember(null)
    navigate('/')
  }

  return (
    <main className="min-h-screen bg-[#faf8f3] text-stone-800">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <Link to="/" className="text-xl font-bold text-amber-900">
            香珍麻油
          </Link>

          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <span>
              你好，{member?.user_name || '訪客'}
            </span>

            {member && !isAdmin && (
              <Link
                to="/my-orders"
                className="text-amber-800 hover:underline"
              >
                我的訂單
              </Link>
            )}

            {isAdmin && (
              <>
                <Link
                  to="/admin/products"
                  className="text-amber-800 hover:underline"
                >
                  商品管理
                </Link>

                <Link
                  to="/admin/orders"
                  className="text-amber-800 hover:underline"
                >
                  訂單管理
                </Link>

                <Link
                  to="/admin/members"
                  className="text-amber-800 hover:underline"
                >
                  會員管理
                </Link>
              </>
            )}

            <Link
              to={member ? '/checkout' : '/login'}
              className="rounded-full bg-amber-800 px-4 py-2 text-white hover:bg-amber-900"
            >
              建立訂單
            </Link>

            {member ? (
              <button
                onClick={logout}
                className="text-amber-800 hover:underline"
              >
                登出
              </button>
            ) : (
              <Link
                to="/login"
                className="text-amber-800 hover:underline"
              >
                登入
              </Link>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="text-3xl font-bold text-amber-900">
          商品瀏覽
        </h1>

        <p className="mt-3 text-stone-600">
          查看麻油及食用油商品的價格與庫存。
        </p>

        {loading ? (
          <p className="py-10 text-stone-500">
            正在載入商品……
          </p>
        ) : error ? (
          <p
            role="alert"
            className="mt-6 rounded-xl bg-red-50 p-4 text-red-700"
          >
            {error}
          </p>
        ) : products.length === 0 ? (
          <p className="mt-6 rounded-xl bg-amber-50 p-4 text-amber-900">
            目前沒有商品。
          </p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product, index) => (
  <article
    key={product.product_id}
    className="min-h-[600px] rounded-2xl border border-stone-200 bg-white p-6"
  >
    <p className="mb-2 text-sm text-stone-500">
      商品序號：{index + 1}
    </p>
                <div className="flex h-96 items-center justify-center overflow-hidden rounded-xl bg-amber-50 text-5xl">
                  {product.image_url ? (
                    <img
                      src={
                        product.image_url.startsWith('http://') ||
                        product.image_url.startsWith('https://')
                          ? product.image_url
                          : `http://localhost:3000${
                              product.image_url.startsWith('/')
                                ? ''
                                : '/'
                            }${product.image_url}`
                      }
                      alt={product.product_name}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    '🫙'
                  )}
                </div>

                <h2 className="mt-5 text-xl font-bold">
                  {product.product_name}
                </h2>

                <p className="mt-2 min-h-12 text-sm leading-6 text-stone-600">
                  {product.description || '歡迎選購本店商品。'}
                </p>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-xl font-bold text-amber-900">
                    NT$ {Number(product.price).toLocaleString('zh-TW')}
                  </span>

                  <span className="text-sm text-stone-500">
                    庫存：{product.stock_quantity}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default Products