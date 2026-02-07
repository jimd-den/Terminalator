import React from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../../Theme';
import { LayoutProps } from '../../../../domain/entities/ThemeComponents';

/**
 * StandardLayout - The default "Console" layout for Terminalator.
 * 
 * Refactored: Removed useTheme hook and direct GlobalTutorBar import to break circular dependency.
 * Receives theme context via props or assumes reasonable defaults.
 */
export const StandardLayout: React.FC<LayoutProps> = ({
    status = "OPERATIONAL",
    headerComponent,
    topContent,
    middleContent,
    bottomContent,
    sideContent,
    tutorBarComponent,
    economyBarComponent,
    style,
    children
}) => {
    // Note: We use global THEME or props. In a pure headless world,
    // colors would come from props or a non-circular context.
    const colors = { primary: '#00FF41', background: '#000', surface: '#0a0a0a' };

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
            zIndex: 10,
        },
        headerText: {
            color: colors.primary,
            fontFamily: THEME.typography.fontFamily,
            fontSize: THEME.typography.fontSize.sm,
        },
        topBox: {
            flex: 1,
            paddingHorizontal: THEME.spacing.xl,
            paddingTop: THEME.spacing.xl,
            backgroundColor: 'transparent',
            zIndex: 10,
        },
        bottomBox: {
            paddingHorizontal: THEME.spacing.xl,
            paddingBottom: THEME.spacing.xl,
            backgroundColor: 'transparent',
            minHeight: 100,
            justifyContent: 'center',
            zIndex: 10,
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

                {economyBarComponent && (
                    <View style={{ zIndex: 11 }}>
                        {economyBarComponent}
                    </View>
                )}

                <View style={dynamicStyles.mainRow}>
                    <View style={dynamicStyles.leftColumn}>
                        <View style={dynamicStyles.topBox}>
                            {topContent}
                        </View>

                        {/* TUTOR BAR AREA */}
                        <View style={{ zIndex: 10 }}>
                            {tutorBarComponent}
                        </View>

                        <View style={{ zIndex: 10 }}>
                            {middleContent}
                        </View>

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
