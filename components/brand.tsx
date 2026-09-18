import styles from "./brand.module.css";

export default function Brand() {
  return (
    <span className={styles.brand}>
      <svg
        viewBox="0 0 24 26"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" />
      </svg>
      <span>sortify</span>
    </span>
  );
}
