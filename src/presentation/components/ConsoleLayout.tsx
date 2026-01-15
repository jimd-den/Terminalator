import React from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../../frameworks-drivers/ui/Theme';

interface ConsoleLayoutProps {
    status?: string;
    topContent: React.ReactNode;
    middleContent?: React.ReactNode;
    bottomContent: React.ReactNode;
    style?: ViewStyle;
}

export const ConsoleLayout: React.FC<ConsoleLayoutProps> = ({
    status = "OPERATIONAL",
    topContent,
    middleContent,
    bottomContent,
    style
}) => {
    return (
        <SafeAreaView style={[styles.container, style]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <View style={styles.header}>
                    <Text style={styles.headerText}>[ STATUS: {status} ]</Text>
                    <Text style={styles.headerText}>{new Date().toLocaleTimeString()}</Text>
                </View>

                {/* TOP BOX: Output/Environment/Buffer */}
                <View style={styles.topBox}>
                    {topContent}
                </View>

                {/* MIDDLE: Virtual Toolbar (Optional) */}
                {middleContent}

                {/* BOTTOM BOX: Input/Prompt/Command */}
                <View style={styles.bottomBox}>
                    {bottomContent}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.colors.background,
    },
    flex: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: THEME.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: THEME.colors.border,
    },
    headerText: {
        color: THEME.colors.text.dim,
        fontFamily: THEME.typography.fontFamily,
        fontSize: THEME.typography.fontSize.sm,
    },
    topBox: {
        flex: 2,
        margin: THEME.spacing.md,
        padding: THEME.spacing.md,
        borderWidth: THEME.borders.width,
        borderColor: THEME.colors.border,
        backgroundColor: THEME.colors.surface,
        overflow: 'hidden', // Ensure content doesn't spill
    },
    bottomBox: {
        margin: THEME.spacing.md,
        marginTop: 0,
        padding: THEME.spacing.md,
        borderWidth: THEME.borders.width,
        borderColor: THEME.colors.primary,
        backgroundColor: THEME.colors.surface,
        minHeight: 60,
        justifyContent: 'center',
    },
});
