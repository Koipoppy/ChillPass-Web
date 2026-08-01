import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Mail, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { register, saveAuth } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import styles from './LoginPage.module.css';

const AVATARS = ['🦊', '🐱', '🐶', '🐼', '🐨', '🦁', '🐰', '🐸', '🐙', '🦋', '🐲', '🌈'];

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const loginToStore = useAuthStore(s => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('🦊');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) { setError('请输入用户名'); return; }
    if (username.trim().length < 3) { setError('用户名至少3个字符'); return; }
    if (!password) { setError('请输入密码'); return; }
    if (password.length < 6) { setError('密码至少6个字符'); return; }
    if (password !== confirmPassword) { setError('两次密码不一致'); return; }

    setLoading(true);
    try {
      const res = await register({
        username: username.trim(),
        password,
        nickname: nickname.trim() || username.trim(),
        avatar,
      });
      saveAuth(res.token, res.user);
      loginToStore(res.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || '注册失败');
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
          <h1 className={styles.title}>创建账户</h1>
          <p className={styles.subtitle}>加入 ChillPass，开始学习之旅</p>
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
                placeholder="至少3个字符"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={styles.input}
                autoFocus
                autoComplete="username"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>昵称（可选）</label>
            <div className={styles.inputWrap}>
              <Mail size={17} className={styles.inputIcon} />
              <input
                type="text"
                placeholder="留空则使用用户名"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>密码</label>
            <div className={styles.inputWrap}>
              <Lock size={17} className={styles.inputIcon} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="至少6个字符"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                autoComplete="new-password"
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

          <div className={styles.field}>
            <label className={styles.label}>确认密码</label>
            <div className={styles.inputWrap}>
              <Lock size={17} className={styles.inputIcon} />
              <input
                type="password"
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={styles.input}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className={styles.avatarSection}>
            <label className={styles.avatarLabel}>选择头像</label>
            <div className={styles.avatarGrid}>
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`${styles.avatarItem} ${avatar === emoji ? styles.avatarSelected : ''}`}
                  onClick={() => setAvatar(emoji)}
                >
                  {emoji}
                </button>
              ))}
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
                <span>注册中...</span>
              </>
            ) : (
              <>
                <span>注册</span>
                <ArrowRight size={18} strokeWidth={2.5} />
              </>
            )}
          </motion.button>
        </form>

        {/* Footer */}
        <div className={styles.footer}>
          <span>已有账户？</span>
          <Link to="/login" className={styles.link}>立即登录</Link>
        </div>
      </div>
    </motion.div>
  );
};

export default RegisterPage;
