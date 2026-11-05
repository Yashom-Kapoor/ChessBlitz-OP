import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import GlobalStyle from '@/context/GlobalStyle';
import { PuzzleAction, PuzzleActionAvailability } from './puzzleActions';

const actions = [
    { key: 'hint', title: 'Hint', description: 'Get help with your next move', icon: 'lightbulb-outline' },
    { key: 'undo', title: 'Undo', description: 'Go back to the previous position', icon: 'undo' },
    { key: 'redo', title: 'Redo', description: 'Replay a move you undid', icon: 'redo' },
    { key: 'reset', title: 'Reset puzzle', description: 'Start this puzzle again', icon: 'restart-alt' },
] as const;

export default function PuzzleOptions({ visible, onClose, onAction, available, isTablet }: {
    visible: boolean;
    onClose: () => void;
    onAction: (action: PuzzleAction) => void;
    available: PuzzleActionAvailability;
    isTablet: boolean;
}) {
    const { theme } = useTheme();
    const textStyles = GlobalStyle(theme, isTablet);
    const insets = useSafeAreaInsets();
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <Pressable accessibilityRole="button" accessibilityLabel="Close puzzle options" onPress={onClose} style={StyleSheet.absoluteFill} />
                <View accessibilityViewIsModal style={[styles.sheet, {
                    backgroundColor: theme.background,
                    borderColor: theme.buttonShadow,
                    borderRadius: isTablet ? 30 : 20,
                    padding: isTablet ? 24 : 20,
                    paddingBottom: Math.max(insets.bottom, 20),
                }]}>
                    <View style={styles.header}>
                        <Text accessibilityRole="header" style={[textStyles.h2, { color: theme.primaryText }]}>Puzzle options</Text>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close puzzle options" onPress={onClose} style={styles.close}>
                            <MaterialIcons name="close" size={26} color={theme.primaryText} />
                        </TouchableOpacity>
                    </View>
                    {actions.map(({ key, title, description, icon }) => (
                        <TouchableOpacity key={key} disabled={!available[key]}
                            accessibilityRole="button" accessibilityState={{ disabled: !available[key] }}
                            accessibilityLabel={title} accessibilityHint={description}
                            onPress={() => onAction(key)}
                            style={[styles.row, { backgroundColor: theme.primaryButton, opacity: available[key] ? 1 : 0.35 }]}>
                            <MaterialIcons name={icon} size={26} color={theme.primaryText} />
                            <View style={styles.label}>
                                <Text style={[textStyles.h4, { color: theme.primaryText }]}>{title}</Text>
                                <Text style={[textStyles.h6, { color: theme.primaryText }]}>{description}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </Modal>
    );
}
const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end', alignItems: 'center' },
    sheet: { width: '100%', maxWidth: 560, borderWidth: 1, gap: 10 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 16 },
    label: { flex: 1, gap: 3 },
});
