import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    children?: React.ReactNode;
}

export const ConsoleLayout: React.FC<ConsoleLayoutProps> = ({
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
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: THEME.spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        headerText: {
            color: colors.text.dim,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.sm,
        },
        topBox: {
            flex: 2,
            margin: THEME.spacing.md,
            padding: THEME.spacing.md,
            borderWidth: THEME.borders.width,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            overflow: 'hidden',
        },
        bottomBox: {
            margin: THEME.spacing.md,
            marginTop: 0,
            padding: THEME.spacing.md,
            borderWidth: THEME.borders.width,
            borderColor: colors.primary,
            backgroundColor: colors.surface,
            minHeight: 60,
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
                    {/* Left Column (Main Terminal) */}
                    <View style={dynamicStyles.leftColumn}>
                        {/* TOP BOX: Output/Environment/Buffer */}
                        <View style={dynamicStyles.topBox}>
                            {topContent}
                        </View>

                        {/* MIDDLE: Virtual Toolbar (Optional) */}
                        {middleContent}

                        {/* BOTTOM BOX: Input/Prompt/Command */}
                        <View style={dynamicStyles.bottomBox}>
                            {bottomContent}
                        </View>
                    </View>

                    {/* Right Column (Side Pane) */}
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
