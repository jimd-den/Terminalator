/**
 * BufferScreen - Presentation Layer
 * 
 * Provides a browseable "Note App" interface for archived terminal outputs.
 * Allows users to review history, filter by tags, and navigate subsections.
 * 
 * Pillar: THE FOUR-FOLD SHIELD (Interface Adapter)
 * Pillar: THE BALANCED SCALE (Clean UI)
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { THEME } from '../Theme';
import { useTheme } from '../context/ThemeContext';
import { CapturedBuffer } from '../../../domain/services/ArchiveService';

interface BufferScreenProps {
    buffers: CapturedBuffer[];
    onClose: () => void;
}

export const BufferScreen: React.FC<BufferScreenProps> = ({ buffers, onClose }) => {
    const { theme, settings } = useTheme();
    const colors = theme.colors;
    const [selectedId, setSelectedId] = useState<string | null>(buffers[0]?.id || null);
    const [filterTag, setFilterTag] = useState<string | null>(null);

    // -- Derived State --
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        buffers.forEach(b => b.tags.forEach(t => tags.add(t)));
        return Array.from(tags).sort();
    }, [buffers]);

    const filteredBuffers = useMemo(() => {
        if (!filterTag) return buffers;
        return buffers.filter(b => b.tags.includes(filterTag));
    }, [buffers, filterTag]);

    const selectedBuffer = useMemo(() =>
        buffers.find(b => b.id === selectedId),
        [buffers, selectedId]);

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            padding: THEME.spacing.md,
        },
        // Channel Bar (Top Focus)
        channelBar: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginBottom: THEME.spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.primary,
            paddingBottom: THEME.spacing.sm,
            gap: 12,
        },
        channelTab: {
            opacity: 0.5,
        },
        activeChannelTab: {
            opacity: 1,
            backgroundColor: colors.primary,
        },
        channelText: {
            color: colors.primary,
            fontFamily: settings.fontFamily,
            fontSize: 14,
            fontWeight: 'bold',
            paddingHorizontal: 4,
        },
        activeChannelText: {
            color: colors.background,
        },
        // Tag Cloud (Secondary Filter)
        tagRow: {
            flexDirection: 'row',
            gap: 8,
            marginBottom: THEME.spacing.md,
            alignItems: 'center',
        },
        tagLabel: {
            color: colors.text.dim,
            fontFamily: settings.fontFamily,
            fontSize: 10,
        },
        tag: {
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderWidth: 1,
            borderColor: colors.primary,
            opacity: 0.6,
        },
        tagActive: {
            backgroundColor: colors.primary,
            opacity: 1,
        },
        tagText: {
            color: colors.primary,
            fontSize: 10,
            fontFamily: settings.fontFamily,
        },
        tagTextActive: {
            color: colors.background,
        },
        // Main Viewer
        detailView: {
            flex: 1,
            borderWidth: 1,
            borderColor: 'rgba(0, 255, 65, 0.1)',
            padding: THEME.spacing.md,
        },
        detailHeader: {
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(0, 255, 65, 0.3)',
            paddingBottom: THEME.spacing.sm,
            marginBottom: THEME.spacing.md,
        },
        detailCmd: {
            color: colors.secondary,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.md,
            fontWeight: 'bold',
        },
        detailMeta: {
            color: colors.text.dim,
            fontFamily: settings.fontFamily,
            fontSize: 10,
            marginTop: 4,
        },
        detailBody: {
            flex: 1,
        },
        outputLine: {
            color: colors.text.primary,
            fontFamily: settings.fontFamily,
            fontSize: THEME.typography.fontSize.sm,
            lineHeight: 20,
        },
        emptyText: {
            color: colors.text.dim,
            fontFamily: settings.fontFamily,
            textAlign: 'center',
            marginTop: 50,
        }
    });

    return (
        <View style={styles.container}>
            {/* 1. Channel Selector (Horizontal Index) */}
            <View style={styles.channelBar}>
                <Text style={[styles.channelText, { opacity: 1, paddingLeft: 0 }]}>ARCHIVE:</Text>
                {filteredBuffers.map(b => {
                    const isActive = b.id === selectedId;
                    return (
                        <Pressable
                            key={b.id}
                            onPress={() => setSelectedId(b.id)}
                            style={[styles.channelTab, isActive && styles.activeChannelTab]}
                        >
                            <Text style={[styles.channelText, isActive && styles.activeChannelText]}>
                                [{b.command.split(' ')[0].toUpperCase()}]
                            </Text>
                        </Pressable>
                    );
                })}
                {filteredBuffers.length === 0 && (
                    <Text style={[styles.channelText, { opacity: 0.3 }]}>[ NO_RECORDS ]</Text>
                )}
            </View>

            {/* 2. Tag Filters (Sub-menu) */}
            <View style={styles.tagRow}>
                <Text style={styles.tagLabel}>FILTER:</Text>
                <Pressable
                    style={[styles.tag, !filterTag && styles.tagActive]}
                    onPress={() => setFilterTag(null)}
                >
                    <Text style={[styles.tagText, !filterTag && styles.tagTextActive]}>ALL</Text>
                </Pressable>
                {allTags.map(tag => (
                    <Pressable
                        key={tag}
                        style={[styles.tag, filterTag === tag && styles.tagActive]}
                        onPress={() => setFilterTag(tag)}
                    >
                        <Text style={[styles.tagText, filterTag === tag && styles.tagTextActive]}>{tag.toUpperCase()}</Text>
                    </Pressable>
                ))}
            </View>

            {/* 3. Detail Viewer */}
            <View style={styles.detailView}>
                {selectedBuffer ? (
                    <>
                        <View style={styles.detailHeader}>
                            <Text style={styles.detailCmd}>$ {selectedBuffer.command}</Text>
                            <Text style={styles.detailMeta}>
                                HOST: {selectedBuffer.hostname} |
                                EXIT: {selectedBuffer.exitCode ?? 'N/A'} |
                                TIME: {new Date(selectedBuffer.timestamp).toLocaleTimeString()}
                            </Text>
                        </View>
                        <ScrollView style={styles.detailBody}>
                            {selectedBuffer.output.map((line, i) => (
                                <Text key={i} style={styles.outputLine}>{line}</Text>
                            ))}
                            {selectedBuffer.output.length === 0 && (
                                <Text style={styles.emptyText}>[ NO OUTPUT RECORDED ]</Text>
                            )}
                        </ScrollView>
                    </>
                ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={styles.emptyText}>SELECT_BUFFER_TO_VIEW</Text>
                    </View>
                )}
            </View>
        </View>
    );
};
