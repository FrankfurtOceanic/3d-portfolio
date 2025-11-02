import Lenis from "lenis";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const config = {
  gap: 0.08,
  speed: 0.3,
  bezierOffset: 0.5,
  arcRadius: 500,
  introProgress: 0.2,
  introFadeOffset: 0.02,
};

const ScrollPhases = Object.freeze({
  INTRO: "intro",
  INTRO_FADE: "introFade",
  MAIN: "main",
});

const scrollPhases = [
  {
    name: ScrollPhases.INTRO,
    start: 0,
    end: config.introProgress,
  },
  {
    name: ScrollPhases.INTRO_FADE,
    start: config.introProgress,
    end: config.introProgress + config.introFadeOffset,
  },
  {
    name: ScrollPhases.MAIN,
    start: config.introProgress + config.introFadeOffset,
    end: 1,
  },
];

async function fetch_items() {
  const response = await fetch("resources/items.json");
  const items = await response.json();
  return items;
}

const items = await fetch_items();

const lenis = new Lenis();
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

document.querySelector(".spotlight-bg-img img").src = items[0].image;
const itemElements = document.querySelector(".spotlight-items");
const imagesContainer = document.querySelector(".spotlight-image-sequence");
const spotlightHeader = document.querySelector(".spotlight-header");
const titlesContainerElement = document.querySelector(
  ".spotlight-items-container"
);
const introTextElements = document.querySelectorAll(".spotlight-intro-text");

const imageElements = [];

console.log(items);

items.forEach((item, index) => {
  const containerElement = document.createElement("div");
  containerElement.className = "spotlight-item";

  const titleElement = document.createElement("h1");
  titleElement.textContent = item.name;
  if (index === 0) titleElement.style.opacity = 1;
  containerElement.appendChild(titleElement);

  const textElement = document.createElement("p");
  textElement.textContent = item.description;
  containerElement.appendChild(textElement);

  itemElements.appendChild(containerElement);

  const imgWrapper = document.createElement("div");
  imgWrapper.className = "spotlight-img";
  const imgElement = document.createElement("img");

  imgElement.src = item.image;
  imgElement.alt = item.name;

  imgWrapper.appendChild(imgElement);
  imagesContainer.appendChild(imgWrapper);
  imageElements.push(imgWrapper);
});

const titlesHeight = itemElements.scrollHeight;
const scrollDistance = titlesHeight + window.innerHeight;

const itemTitles = itemElements.querySelectorAll("h1");
const spotlightItems = itemElements.querySelectorAll(".spotlight-item");

let currentActiveIndex = 0;

const containerWidth = window.innerWidth * 0.3;
const containerHeight = window.innerHeight;
const arcStartX = containerWidth - 220;
const arcStartY = -200;
const arcEndY = containerHeight + 200;
const arcControlPointX = arcStartX + config.arcRadius;
const arcControlPointY = containerHeight / 2;

function getBezierPosition(t) {
  const x =
    (1 - t) * (1 - t) * arcStartX +
    2 * (1 - t) * t * arcControlPointX +
    t * t * arcStartX;
  const y =
    (1 - t) * (1 - t) * arcStartY +
    2 * (1 - t) * t * arcControlPointY +
    t * t * arcEndY;
  return { x, y };
}

function getImgProgressState(index, overallProgress, bezierOffset = 0) {
  const startTime = index * config.gap;
  const endTime = startTime + config.speed;

  // Map progress relative to this image
  let progress = (overallProgress - startTime) / config.speed;

  // Allow progress < 0 so images before their nominal start can move
  // We shift progress by bezierOffset
  const t = config.bezierOffset + progress * (1 - config.bezierOffset);

  return t; // can be < 0 or > 1, we’ll clamp later in the MAIN loop
}

imageElements.forEach((img) => gsap.set(img, { opacity: 0 }));

let hasPlayedHeaderFadeIn = false;
let hasPlayedHeaderFadeOut = false;

ScrollTrigger.create({
  trigger: ".spotlight",
  start: "top top",
  end: `+=${window.innerHeight * 6}px`,
  pin: true,
  pinSpacing: true,
  scrub: 1,
  onUpdate: (self) => {
    const progress = self.progress;
    const phase = getCurrentPhase(progress);

    switch (phase) {
      //intro animation
      case ScrollPhases.INTRO: {
        const phaseProgress = getCurrentPhaseProgress(phase, progress);
        // text split effect
        const moveDistance = window.innerWidth * 0.6;
        gsap.set(introTextElements[0], {
          x: -phaseProgress * moveDistance,
          opacity: 1,
        });
        gsap.set(introTextElements[1], {
          x: phaseProgress * moveDistance,
          opacity: 1,
        });

        //zoom in on background image container
        gsap.set(".spotlight-bg-img", {
          transform: `scale(${phaseProgress})`,
        });
        gsap.set(".spotlight-bg-img img", {
          transform: `scale(${2 - phaseProgress * 1})`,
        });

        imageElements.forEach((img) => gsap.set(img, { opacity: 0 }));
        if (!hasPlayedHeaderFadeOut && hasPlayedHeaderFadeIn) {
          hasPlayedHeaderFadeIn = false;
          hasPlayedHeaderFadeOut = true;
          fadeOutHeader(spotlightHeader);
        }

        gsap.set(titlesContainerElement, {
          "--before-opacity": "0",
          "--after-opacity": "0",
          "--spotlight-items-opacity": "0",
        });
        break;
      }

      case ScrollPhases.INTRO_FADE: {
        if (!hasPlayedHeaderFadeIn) {
          hasPlayedHeaderFadeIn = true;
          hasPlayedHeaderFadeOut = false;
          fadeInElement(spotlightHeader);
        }

        gsap.set(".spotlight-bg-img", { scale: 1 });
        gsap.set(".spotlight-bg-img img", { scale: 1 });

        gsap.set(introTextElements[0], { opacity: 0 });
        gsap.set(introTextElements[1], { opacity: 0 });

        gsap.set(titlesContainerElement, {
          "--before-opacity": "1",
          "--after-opacity": "1",
        });

        break;
      }

      case ScrollPhases.MAIN: {
        const phaseProgress = getCurrentPhaseProgress(phase, progress);

        gsap.set(".spotlight-bg-img", { scale: 1 });
        gsap.set(".spotlight-bg-img img", { scale: 1 });

        gsap.set(introTextElements[0], { opacity: 0 });
        gsap.set(introTextElements[1], { opacity: 0 });

        gsap.set(titlesContainerElement, {
          "--before-opacity": "1",
          "--after-opacity": "1",
          "--spotlight-items-opacity": "1",
        });

        const firstTitle = itemElements.querySelector("h1");
        const firstTitleHeight = firstTitle?.offsetHeight || 0;
        const viewportHeight = window.innerHeight;
        const titlesContainerHeight = itemElements.scrollHeight;
        const startPos = (viewportHeight - firstTitleHeight) / 2;
        const targetPos = -titlesContainerHeight;
        const totalDist = startPos - targetPos;
        const currentY = startPos - totalDist * phaseProgress;

        gsap.set(".spotlight-items", {
          transform: `translateY(${currentY}px)`,
        });

        imageElements.forEach((img, index) => {
          let t = getImgProgressState(
            index,
            phaseProgress,
            config.bezierOffset
          );

          // Only hide if t < 0 or t > 1 (outside curve)
          if (t < 0 || t > 1) {
            gsap.set(img, { opacity: 0 });
            return;
          }

          const pos = getBezierPosition(t);

          gsap.set(img, {
            x: pos.x - 100,
            y: pos.y - 75,
            opacity: 1,
          });
        });

        spotlightItems[currentActiveIndex].style.opacity = 1;
        const viewportMiddle = viewportHeight / 2;
        let closestIndex = 0;
        let closestDistance = Infinity;

        spotlightItems.forEach((item, index) => {
          const itemRect = item.getBoundingClientRect();
          const center = itemRect.top + itemRect.height / 2;
          const distance = Math.abs(viewportMiddle - center);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        });

        if (closestIndex !== currentActiveIndex) {
          spotlightItems[currentActiveIndex].style.opacity = 0.25;
          spotlightItems[closestIndex].style.opacity = 1;
          document.querySelector(".spotlight-bg-img img").src =
            items[closestIndex].image;
          currentActiveIndex = closestIndex;
        }

        break;
      }
    }
  },
});

function fadeInElement(element) {
  gsap.to(element, { opacity: 1, y: 0, duration: 1.2, ease: "power2.out" });
}

function fadeOutHeader(element) {
  gsap.to(element, { opacity: 0, y: 20, duration: 1.2, ease: "power2.in" });
}

function getCurrentPhase(progress) {
  return scrollPhases.find(
    (phase) => progress >= phase.start && progress < phase.end
  )?.name;
}

function getCurrentPhaseProgress(phase, progress) {
  const phaseInfo = scrollPhases.find((p) => p.name === phase);
  if (!phaseInfo) {
    console.error("Phase not found:", phase);
    return 0;
  }

  const phaseProgress =
    (progress - phaseInfo.start) / (phaseInfo.end - phaseInfo.start);
  return Math.min(Math.max(phaseProgress, 0), 1);
}
