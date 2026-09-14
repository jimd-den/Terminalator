import React from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../../Theme';
import { LayoutProps } from '../../../../domain/entities/ThemeComponents';

/**
 * StandardLayout - The default "Console" layout for Terminalator.
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
    children,
    theme,
    settings
}) => {
    const { height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const colors = theme.colors;

    const dynamicStyles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        flex: {
            flex: 1,
            paddingTop: insets.top, // Only manual top inset
        },
        mainRow: {
            flex: 1,
            flexDirection: 'row',
            overflow: 'hidden',
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
        // The header slot is a bare mount point: components dropped in here
        // (SystemBar) own their own padding and rule, so wrapping them in a
        // second bordered, padded box just doubled the chrome.
        header: {
            zIndex: 10,
        },
        headerFallback: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: THEME.spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: colors.primary_10,
        },
        headerText: {
            color: colors.primary,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.sm,
        },
        topBox: {
            flex: 1, // Let topBox grow to fill available space
            paddingHorizontal: THEME.spacing.md,
            paddingTop: THEME.spacing.sm,
            backgroundColor: 'transparent',
            zIndex: 10,
        },
        bottomBox: {
            paddingHorizontal: THEME.spacing.md,
            paddingTop: THEME.spacing.xs,
            paddingBottom: THEME.spacing.md,
            backgroundColor: 'transparent',
            justifyContent: 'center',
            zIndex: 10,
        },
    });

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={dynamicStyles.container}
        >
            <View style={dynamicStyles.flex}>
                {headerComponent ? (
                    <View style={dynamicStyles.header}>
                        {headerComponent}
                    </View>
                ) : (
                    <View style={[dynamicStyles.header, dynamicStyles.headerFallback]}>
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
                        <View style={{ zIndex: 12 }}>
                            {tutorBarComponent}
                        </View>

                        {middleContent && (
                            <View style={{ zIndex: 11 }}>
                                {middleContent}
                            </View>
                        )}

                        {bottomContent && (
                            <View style={dynamicStyles.bottomBox}>
                                {bottomContent}
                            </View>
                        )}
                    </View>

                    {sideContent && (
                        <View style={dynamicStyles.rightColumn}>
                            {sideContent}
                        </View>
                    )}
                </View>
                {children}
            </View>
        </KeyboardAvoidingView>
    );
};
