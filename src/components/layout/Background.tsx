import styles from './Background.module.css'

/**
 * 灰度波动背景
 * 三层叠加：明暗光斑 + 液态波纹 + 噪点
 */
export default function Background() {
  return (
    <>
      <div className={styles.bgLayer}>
        <div className={`${styles.bgBlob} ${styles.blob1}`} />
        <div className={`${styles.bgBlob} ${styles.blob2}`} />
        <div className={`${styles.bgBlob} ${styles.blob3}`} />
        <div className={`${styles.bgBlob} ${styles.blob4}`} />
        <div className={`${styles.bgBlob} ${styles.blobLight1}`} />
        <div className={`${styles.bgBlob} ${styles.blobLight2}`} />
      </div>
      <div className={styles.bgNoise} />
    </>
  )
}
