import { useLenisScroll } from "../../context/LenisContext";

export default function ScrollLink({ to, className, children, onClick, ...props }) {
  const { scrollToSection } = useLenisScroll();
  const hash = to.startsWith("#") ? to : `#${to}`;

  const handleClick = (event) => {
    event.preventDefault();
    onClick?.(event);
    scrollToSection(hash);
  };

  return (
    <a href={`/${hash}`} className={className} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
