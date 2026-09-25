"use client";

import { useEffect } from "react";

type Props = {
  heroPhone: string;
  floatingTop: string;
  floatingBottom: string;
  workoutPhoneSet: string;
  nutritionPhoneSet: string;
  phoneStack: string;
  phone: string;
  progressLine: string;
  chart: string;
  swapArrow: string;
  coachBubble: string;
  userBubble: string;
  mealStatus: string;
  restTimer: string;
};

export default function MobileMotion(classes: Props) {
  useEffect(() => {
    if (window.innerWidth > 900 || !("animate" in Element.prototype)) return;

    const animations: Animation[] = [];
    const all = (className: string) => Array.from(document.querySelectorAll<HTMLElement>(`.${className}`));
    const run = (element: HTMLElement, frames: Keyframe[], duration: number, delay = 0) => {
      element.style.animation = "none";
      const animation = element.animate(frames, {
        duration,
        delay,
        iterations: Infinity,
        easing: "cubic-bezier(.45,0,.2,1)",
      });
      animations.push(animation);
    };
    const float = (element: HTMLElement, x: number, y: number, scale: number, duration: number, delay = 0) => {
      const base = getComputedStyle(element).transform;
      const transform = base === "none" ? "" : base;
      run(element, [
        { transform: `${transform} translate3d(0,0,0) scale(1)` },
        { transform: `${transform} translate3d(${x}px,${y}px,0) scale(${scale})`, offset: .48 },
        { transform: `${transform} translate3d(${x * .35}px,${y * .45}px,0) scale(${1 + (scale - 1) * .45})`, offset: .72 },
        { transform: `${transform} translate3d(0,0,0) scale(1)` },
      ], duration, delay);
    };

    all(classes.heroPhone).forEach((el) => float(el, 7, -20, 1.035, 3800));
    all(classes.floatingTop).forEach((el) => float(el, -10, -12, 1.025, 3200, -500));
    all(classes.floatingBottom).forEach((el) => float(el, 10, -10, 1.025, 3500, -1200));

    [classes.workoutPhoneSet, classes.nutritionPhoneSet, classes.phoneStack].forEach((groupClass) => {
      all(groupClass).forEach((group) => {
        Array.from(group.querySelectorAll<HTMLElement>(`.${classes.phone}`)).forEach((phone, index) => {
          const direction = index === 0 ? 12 : index === 2 ? -12 : 0;
          float(phone, direction, index === 1 ? -28 : -20, index === 1 ? 1.055 : 1.03, 3000 + index * 180, -index * 700);
        });
      });
    });

    all(classes.progressLine).forEach((line) => {
      line.querySelectorAll<HTMLElement>("i").forEach((bar) => run(bar, [
        { transform: "scaleX(.18)" },
        { transform: "scaleX(1)", offset: .62 },
        { transform: "scaleX(.18)" },
      ], 3600));
    });
    all(classes.chart).forEach((chart) => chart.querySelectorAll<HTMLElement>("i").forEach((bar, index) => run(bar, [
      { transform: "scaleY(.25)", opacity: .5 },
      { transform: "scaleY(1)", opacity: 1, offset: .55 },
      { transform: "scaleY(.25)", opacity: .5 },
    ], 3200, index * 90)));
    all(classes.swapArrow).forEach((el) => run(el, [{ transform: "translateY(-4px)" }, { transform: "translateY(7px)" }, { transform: "translateY(-4px)" }], 1300));
    [...all(classes.coachBubble), ...all(classes.userBubble)].forEach((el, index) => run(el, [
      { opacity: .25, transform: "translateY(10px)" },
      { opacity: 1, transform: "translateY(0)", offset: .3 },
      { opacity: 1, transform: "translateY(0)", offset: .8 },
      { opacity: .25, transform: "translateY(-5px)" },
    ], 4200, index * 450));
    all(classes.mealStatus).forEach((el) => run(el, [{ transform: "scale(.92)" }, { transform: "scale(1.1)" }, { transform: "scale(.92)" }], 1700));
    all(classes.restTimer).forEach((el) => run(el, [{ filter: "drop-shadow(0 0 0 rgba(23,164,74,0))" }, { filter: "drop-shadow(0 0 13px rgba(23,164,74,.42))" }, { filter: "drop-shadow(0 0 0 rgba(23,164,74,0))" }], 1500));

    return () => animations.forEach((animation) => animation.cancel());
  }, [classes]);

  return null;
}
