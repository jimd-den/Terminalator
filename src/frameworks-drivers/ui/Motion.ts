/**
 * Motion.ts - Presentation Layer
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * The Motion System ("Juice")
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Timings and curves lived as magic numbers scattered across components -- 800
 * here, 200 there, 30ms somewhere else -- so nothing moved in sympathy with
 * anything else and the interface read as a set of unrelated widgets rather
 * than one machine.
 *
 * The house style borrowed here is Nintendo's, which is less about decoration
 * than about three habits:
 *
 *   1. ACKNOWLEDGE EVERY INPUT, IMMEDIATELY. A press must move something
 *      within a frame or two, even if the real work takes longer. Silence
 *      reads as a broken control.
 *   2. OVERSHOOT, THEN SETTLE. Nothing decelerates straight into its final
 *      position; it passes it slightly and springs back. That is what makes
 *      an interface feel physical rather than tweened.
 *   3. MOTION MUST NEVER COST LEGIBILITY. This is a terminal -- text is the
 *      product. Things may pop, slide and squash on the way in, but they land
 *      crisp, square and readable, and they get out of the way fast.
 *
 * Durations are deliberately short. The temptation with springy motion is to
 * let it luxuriate; on a phone, where the player issues commands in quick
 * succession, anything past ~350ms starts to feel like latency.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Animated, Easing } from 'react-native';

/**
 * Durations, in milliseconds.
 *
 * `instant` is the press-acknowledgement budget: below roughly 90ms a
 * transition reads as "immediate" rather than as an animation, which is
 * exactly what a button press wants.
 */
export const DURATION = {
    instant: 70,
    quick: 140,
    base: 220,
    slow: 340,
    /** Reserved for deliberate set-piece moments, not routine feedback. */
    theatrical: 620
} as const;

/**
 * Easing curves.
 *
 * `pop` overshoots and settles -- the workhorse for anything entering.
 * `snap` is a hard ease-out for things leaving or collapsing: exits should
 * feel decisive, never coy.
 */
export const EASE = {
    pop: Easing.bezier(0.34, 1.56, 0.64, 1),
    snap: Easing.bezier(0.22, 1, 0.36, 1),
    smooth: Easing.bezier(0.4, 0, 0.2, 1),
    /** Anticipation: pulls back slightly before moving off. */
    anticipate: Easing.bezier(0.68, -0.4, 0.32, 1)
} as const;

/**
 * Spring presets. `bouncy` is for celebratory moments (a counter ticking up),
 * `firm` for structural motion that must not distract.
 */
export const SPRING = {
    bouncy: { friction: 5, tension: 180 },
    firm: { friction: 9, tension: 140 },
    stiff: { friction: 12, tension: 220 }
} as const;

/**
 * Per-item delay when a list cascades in.
 *
 * Kept small on purpose: a long stagger looks charming with five items and
 * intolerable with forty, and a net-scan can return forty.
 */
export const STAGGER_MS = 22;

/** Cap total stagger so a large result set never crawls in. */
export const staggerDelay = (index: number, max = 8) =>
    Math.min(index, max) * STAGGER_MS;

// ─────────────────────────────────────────────────────────────────────────────
// Reusable animation builders
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The press acknowledgement: squash down fast, spring back.
 * Pass the same value to a `scale` transform.
 */
export const pressIn = (value: Animated.Value) =>
    Animated.timing(value, {
        toValue: 0.92,
        duration: DURATION.instant,
        easing: EASE.snap,
        useNativeDriver: true
    });

export const pressOut = (value: Animated.Value) =>
    Animated.spring(value, {
        toValue: 1,
        ...SPRING.bouncy,
        useNativeDriver: true
    });

/**
 * A value "pops" to draw the eye, then returns. Used when a number changes:
 * the change itself should be the thing you notice, not the number's presence.
 */
export const popEmphasis = (value: Animated.Value, peak = 1.35) =>
    Animated.sequence([
        Animated.timing(value, {
            toValue: peak,
            duration: DURATION.instant,
            easing: EASE.pop,
            useNativeDriver: true
        }),
        Animated.spring(value, {
            toValue: 1,
            ...SPRING.bouncy,
            useNativeDriver: true
        })
    ]);

/**
 * Entrance for a card or row: rises a little, scales up from slightly small,
 * fades in -- all on one driver so the parts cannot desynchronise.
 */
export const enter = (progress: Animated.Value, delay = 0) =>
    Animated.timing(progress, {
        toValue: 1,
        duration: DURATION.base,
        delay,
        easing: EASE.pop,
        useNativeDriver: true
    });

/**
 * The transform set that pairs with `enter`. Interpolating one driver keeps
 * translate/scale/opacity locked together.
 */
export const enterStyle = (progress: Animated.Value, rise = 14) => ({
    opacity: progress,
    transform: [
        {
            translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [rise, 0]
            })
        },
        {
            scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.96, 1]
            })
        }
    ]
});
