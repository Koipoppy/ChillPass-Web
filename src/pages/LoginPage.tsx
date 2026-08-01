import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { login, saveAuth } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import styles from './LoginPage.module.css';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const loginToStore = useAuthStore(s => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('请输入用户名和密码');
      return;
    }
    setLoading(true);
    try {
      const res = await login({ username: username.trim(), password });
      saveAuth(res.token, res.user);
      loginToStore(res.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className={styles.card}>
        {/* Brand */}
        <div className={styles.brand}>
          <h1 className={styles.title}>ChillPass</h1>
          <p className={styles.subtitle}>登录账户，继续期末冲刺</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <motion.div
              className={styles.error}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              {error}
            </motion.div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>用户名</label>
            <div className={styles.inputWrap}>
              <User size={17} className={styles.inputIcon} />
              <input
                type="text"
                placeholder="输入你的用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={styles.input}
                autoFocus
                autoComplete="username"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>密码</label>
            <div className={styles.inputWrap}>
              <Lock size={17} className={styles.inputIcon} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="输入你的密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.toggleBtn}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <motion.button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.01 }}
            whileTap={{ scale: loading ? 1 : 0.99 }}
          >
            {loading ? (
              <>
                <span className={styles.spinner} />
                <span>登录中...</span>
              </>
            ) : (
              <>
                <span>登录</span>
                <ArrowRight size={18} strokeWidth={2.5} />
              </>
            )}
          </motion.button>
        </form>

        {/* Footer */}
        <div className={styles.footer}>
          <span>还没有账户？</span>
          <Link to="/register" className={styles.link}>立即注册</Link>
        </div>
      </div>
    </motion.div>
  );
};

export default LoginPage;
