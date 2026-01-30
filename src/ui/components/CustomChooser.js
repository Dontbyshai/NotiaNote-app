import React, { useState } from 'react';
import { Platform, Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import * as DropdownMenu from 'zeego/dropdown-menu' // Incompatible with Expo Go on Android

// Custom chooser compatible with Expo Go
function CustomChooser({
  title,
  defaultItem,
  getItemForSelected,
  selected,
  setSelected = () => { },
  items = [],
  longPress = false,
}) {
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    setVisible(true);
  };

  const handleSelect = (item) => {
    setVisible(false);
    if (item.onPress) {
      item.onPress();
    } else {
      setSelected(item.id);
    }
  };

  return (
    <>
      <TouchableOpacity onPress={!longPress ? handlePress : undefined} onLongPress={longPress ? handlePress : undefined} activeOpacity={0.7}>
        {((selected || selected === 0) && getItemForSelected) ? getItemForSelected(selected) : defaultItem}
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {items.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.item, index === items.length - 1 && styles.lastItem]}
                  onPress={() => handleSelect(item)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, item.destructive && styles.destructiveText]}>
                      {item.title}
                    </Text>
                    {item.subtitle && (
                      <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                    )}
                  </View>
                  {/* Icon support could be added here if needed */}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B', // Dark theme default, could context theme if needed
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 15,
    marginBottom: 10,
    alignItems: 'center'
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  item: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    alignItems: 'center'
  },
  lastItem: {
    borderBottomWidth: 0
  },
  itemTitle: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '500'
  },
  destructiveText: {
    color: '#EF4444'
  },
  itemSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2
  }
});

export default CustomChooser;