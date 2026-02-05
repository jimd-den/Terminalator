import React from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../../Theme';
import { useTheme } from '../../context/ThemeContext';
import { LayoutProps } from '../../../../domain/entities/ThemeComponents';
import { GlobalTutorBar } from '../../components/GlobalTutorBar';

/**
 * StandardLayout - The default "Console" layout for Terminalator.
 * 
 * Pillar: THE UNIVERSAL INTERFACE (Universal Layout)
 */
export const StandardLayout: React.FC<LayoutProps> = ({
    status = "OPERATIONAL",
    headerComponent,
    topContent,
    middleContent,
    bottomContent,
    sideContent,
    style,
    children
}) => {
    const { theme, settings } = useTheme();
    const colors = theme.colors;

    const dynamicStyles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        flex: {
            flex: 1,
        },
        mainRow: {
            flex: 1,
            flexDirection: 'row',
        },
        leftColumn: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
        },
        rightColumn: {
            flex: 1,
            borderLeftWidth: 1,
            borderLeftColor: colors.primary,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: THEME.spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(0, 255, 65, 0.1)',
        },
        headerText: {
            color: colors.primary,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.sm,
        },
        topBox: {
            flex: 1,
            paddingHorizontal: THEME.spacing.xl,
            paddingTop: THEME.spacing.xl,
            backgroundColor: 'transparent',
        },
        bottomBox: {
            paddingHorizontal: THEME.spacing.xl,
            paddingBottom: THEME.spacing.xl,
            backgroundColor: 'transparent',
            minHeight: 100,
            justifyContent: 'center',
        },
    });

    return (
        <SafeAreaView style={[dynamicStyles.container, style]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                style={dynamicStyles.flex}
            >

                {headerComponent ? (
                    <View style={dynamicStyles.header}>
                        {headerComponent}
                    </View>
                ) : (
                    <View style={dynamicStyles.header}>
                        <Text style={dynamicStyles.headerText}>[ STATUS: {status} ]</Text>
                    </View>
                )}

                <View style={dynamicStyles.mainRow}>
                    <View style={dynamicStyles.leftColumn}>
                        <View style={dynamicStyles.topBox}>
                            {topContent}
                        </View>

                        {/* TUTOR BAR AREA */}
                        <View style={{ zIndex: 10 }}>
                            <GlobalTutorBar />
                        </View>

                        {middleContent}

                        <View style={dynamicStyles.bottomBox}>
                            {bottomContent}
                        </View>
                    </View>

                    {sideContent && (
                        <View style={dynamicStyles.rightColumn}>
                            {sideContent}
                        </View>
                    )}
                </View>

            </KeyboardAvoidingView>
            {children}
        </SafeAreaView>
    );
};