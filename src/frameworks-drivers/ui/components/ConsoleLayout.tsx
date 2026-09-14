import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../Theme';
import { useTheme } from '../context/ThemeContext';

interface ConsoleLayoutProps {
    status?: string;
    headerComponent?: React.ReactNode;
    topContent: React.ReactNode;
    middleContent?: React.ReactNode;
    bottomContent: React.ReactNode;
    style?: ViewStyle;
    sideContent?: React.ReactNode;
    /**
     * Slots mirroring StandardLayout. This layout previously hardcoded its own
     * GlobalTutorBar and had no economy slot at all, so a screen using it
     * silently lost chrome that the standard layout showed -- and could not
     * suppress the tutor bar even where it made no sense.
     */
    tutorBarComponent?: React.ReactNode;
    economyBarComponent?: React.ReactNode;
    children?: React.ReactNode;
}

export const ConsoleLayout: React.FC<ConsoleLayoutProps> = ({
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
    const { theme, settings } = useTheme();
    const insets = useSafeAreaInsets();
    const colors = theme.colors;

    const dynamicStyles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        flex: {
            flex: 1,
            paddingTop: insets.top, // Only handle top inset here
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
            justifyContent: 'center', // [MOBILE-CENTRIC] Main focal point
            alignItems: 'center',
            paddingVertical: THEME.spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.primary_10,
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
            overflow: 'hidden',
        },
        bottomBox: {
            paddingHorizontal: THEME.spacing.xl,
            paddingBottom: THEME.spacing.xl,
            backgroundColor: 'transparent',
            minHeight: 80,
            justifyContent: 'center',
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
                    <View style={dynamicStyles.header}>
                        <Text style={dynamicStyles.headerText}>[ STATUS: {status} ]</Text>
                    </View>
                )}

                {economyBarComponent}

                <View style={dynamicStyles.mainRow}>
                    {/* Left Column (Main Terminal) */}
                    <View style={dynamicStyles.leftColumn}>
                        {/* TOP BOX: Output/Environment/Buffer */}
                        <View style={dynamicStyles.topBox}>
                            {topContent}
                        </View>

                        {/* TUTOR BAR: IRC-style chat above the keyboard/F-keys */}
                        {tutorBarComponent}

                        {/* MIDDLE: Virtual Toolbar (Optional) */}
                        {middleContent && (
                            <View>
                                {middleContent}
                            </View>
                        )}

                        {/* BOTTOM BOX: Input/Prompt/Command */}
                        {bottomContent && (
                            <View style={dynamicStyles.bottomBox}>
                                {bottomContent}
                            </View>
                        )}
                    </View>

                    {/* Right Column (Side Pane) */}
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
