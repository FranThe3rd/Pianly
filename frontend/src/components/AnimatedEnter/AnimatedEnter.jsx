import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

export function AnimatedEnter({
  children,
  className,
  delay = 0,
  y = 24,
  duration = 0.55,
  as = "div",
  ...rest
}) {
  const reduceMotion = useReducedMotion();
  const Component = motion[as] ?? motion.div;

  if (reduceMotion) {
    const Tag = as === "div" ? "div" : as;
    return (
      <Tag className={className} {...rest}>
        {children}
      </Tag>
    );
  }

  return (
    <Component
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </Component>
  );
}

export function AnimatedWords({
  text,
  className,
  as: Tag = "h1",
  baseDelay = 0,
  wordDelay = 0.07,
}) {
  const reduceMotion = useReducedMotion();
  const words = text.split(" ");

  if (reduceMotion) {
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <Tag className={className} aria-label={text}>
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          className="animated-word"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: baseDelay + index * wordDelay,
            ease: EASE,
          }}
        >
          {word}
        </motion.span>
      ))}
    </Tag>
  );
}

export function AnimatedInView({
  children,
  className,
  y = 28,
  duration = 0.55,
  as = "div",
}) {
  const reduceMotion = useReducedMotion();
  const Component = motion[as] ?? motion.div;

  if (reduceMotion) {
    const Tag = as === "div" ? "div" : as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <Component
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.45 }}
      transition={{ duration, ease: EASE }}
    >
      {children}
    </Component>
  );
}
