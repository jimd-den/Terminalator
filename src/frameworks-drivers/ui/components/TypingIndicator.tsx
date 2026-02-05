import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export const TypingIndicator = () => {
    const { theme } = useTheme();
    const colors = theme.colors;
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    const animate = (val: Animated.Value, delay: number) => {
        return Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(val, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(val, { toValue: 0, duration: 300, useNativeDriver: true }),
            ])
        );
    };

    useEffect(() => {
        const a1 = animate(dot1, 0);
        const a2 = animate(dot2, 200);
        const a3 = animate(dot3, 400);
        a1.start(); a2.start(); a3.start();
        return () => { a1.stop(); a2.stop(); a3.stop(); };
    }, []);

    const dotStyle = (val: Animated.Value) => ({
        opacity: val,
        backgroundColor: colors.primary,
        width: 4,
        height: 4,
        borderRadius: 2,
        marginHorizontal: 2,
    });

    return (
        <View style={styles.container}>
            <Animated.View style={dotStyle(dot1)} />
            <Animated.View style={dotStyle(dot2)} />
            <Animated.View style={dotStyle(dot3)} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        height: 20,
    }
});
