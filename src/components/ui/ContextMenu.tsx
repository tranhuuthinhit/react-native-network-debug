import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { radius, useTheme } from '../../theme';
import Txt from './Text';
import Icon, { IconName } from '../Icon';

export type MenuItem = {
  label: string;
  icon?: IconName;
  onPress: () => void;
  destructive?: boolean;
};

export type LiftedField = {
  /** Mono key shown above the value, e.g. `authorization`. */
  key?: string;
  /** The value, lifted in `textStrong`. */
  value: string;
};

type MenuRequest = {
  field?: LiftedField;
  items: MenuItem[];
};

type ContextMenuValue = {
  open: (request: MenuRequest) => void;
};

const ContextMenuContext = createContext<ContextMenuValue>({ open: () => {} });

export const useContextMenu = () => useContext(ContextMenuContext);

/**
 * Screen 10: long-press lifts the pressed field above a dimmed backdrop
 * and shows the actions beneath it. The same pattern serves a header
 * field, a list row and a JSON node — only the item list differs.
 *
 * The lifted field is rendered from the request's own `field` payload
 * rather than measuring and cloning the pressed view, which keeps it
 * reliable across `FlatList` recycling.
 */
export const ContextMenuProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const theme = useTheme();
  const [request, setRequest] = useState<MenuRequest | null>(null);

  const open = useCallback((next: MenuRequest) => setRequest(next), []);
  const close = useCallback(() => setRequest(null), []);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <ContextMenuContext.Provider value={value}>
      {children}

      <Modal
        visible={!!request}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={close}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Dismiss menu"
        >
          <View style={styles.centre} pointerEvents="box-none">
            {!!request?.field && (
              <View
                style={[
                  styles.lifted,
                  {
                    backgroundColor: theme.colors.surfaceAlt,
                    borderColor: theme.colors.menuBorder,
                  },
                ]}
              >
                {!!request.field.key && (
                  <Txt
                    variant="headerKey"
                    mono
                    color={theme.colors.textMuted}
                    style={{ marginBottom: 4 }}
                  >
                    {request.field.key}
                  </Txt>
                )}
                <ScrollView style={{ maxHeight: 140 }}>
                  <Txt
                    variant="headerValue"
                    mono
                    color={theme.colors.textStrong}
                  >
                    {request.field.value}
                  </Txt>
                </ScrollView>
              </View>
            )}

            <View
              style={[
                styles.menu,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderColor: theme.colors.menuBorder,
                },
              ]}
            >
              {request?.items.map((item, index) => (
                <View key={item.label}>
                  {index > 0 && (
                    <View
                      style={{
                        height: StyleSheet.hairlineWidth * 2,
                        backgroundColor: theme.colors.menuDivider,
                      }}
                    />
                  )}
                  <Pressable
                    onPress={() => {
                      close();
                      item.onPress();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    style={({ pressed }) => [
                      styles.menuRow,
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <View style={styles.menuIcon}>
                      {!!item.icon && (
                        <Icon
                          name={item.icon}
                          size={15}
                          color={
                            item.destructive
                              ? theme.colors.dangerText
                              : theme.colors.textSecondary
                          }
                        />
                      )}
                    </View>
                    <Txt
                      variant="sheetItem"
                      color={
                        item.destructive
                          ? theme.colors.dangerText
                          : theme.colors.text
                      }
                    >
                      {item.label}
                    </Txt>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </ContextMenuContext.Provider>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  centre: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  lifted: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingVertical: 13,
    paddingHorizontal: 15,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.65,
    shadowRadius: 44,
    shadowOffset: { width: 0, height: 18 },
    elevation: 18,
  },
  menu: {
    borderRadius: radius.cardLg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.7,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 24 },
    elevation: 24,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuIcon: { width: 15, marginRight: 12, alignItems: 'center' },
});

export default ContextMenuProvider;
