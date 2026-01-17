import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../../frameworks-drivers/ui/Theme';
import { useTheme } from '../context/ThemeContext';

interface ConsoleLayoutProps {
    status?: string;
    topContent: React.ReactNode;
    middleContent?: React.ReactNode;
    bottomContent: React.ReactNode;
    style?: ViewStyle;
    children?: React.ReactNode;
}

export const ConsoleLayout: React.FC<ConsoleLayoutProps> = ({
    status = "OPERATIONAL",
    topContent,
    middleContent,
    bottomContent,
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
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
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
                <View style={dynamicStyles.header}>
                    <Text style={dynamicStyles.headerText}>[ STATUS: {status} ]</Text>
                    <Text style={dynamicStyles.headerText}>{new Date().toLocaleTimeString()}</Text>
                </View>

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
            </KeyboardAvoidingView>
            {children}
        </SafeAreaView>
    );
};
