/* eslint-disable */
import dynamic from 'next/dynamic';

import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
// Dynamically import PDFViewer only on the client-side
const PDFViewer = dynamic(() => import('@react-pdf/renderer').then((mod) => mod.PDFViewer), {
  ssr: false,
});

// 創建樣式
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableCol: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableCell: {
    margin: 'auto',
    marginTop: 5,
    marginBottom: 5,
  },
});

// 創建文檔組件
const MyDocument = () => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={styles.tableCol}>
            <Text style={styles.tableCell}>Header1</Text>
          </View>
          <View style={styles.tableCol}>
            <Text style={styles.tableCell}>Header2</Text>
          </View>
          <View style={styles.tableCol}>
            <Text style={styles.tableCell}>Header3</Text>
          </View>
          <View style={styles.tableCol}>
            <Text style={styles.tableCell}>Header4</Text>
          </View>
        </View>
        {/* 表格行數據 */}
        <View style={styles.tableRow}>
          <View style={styles.tableCol}>
            <Text style={styles.tableCell}>Data1</Text>
          </View>
          <View style={styles.tableCol}>
            <Text style={styles.tableCell}>Data2</Text>
          </View>
          <View style={styles.tableCol}>
            <Text style={styles.tableCell}>Data3</Text>
          </View>
          <View style={styles.tableCol}>
            <Text style={styles.tableCell}>Data4</Text>
          </View>
        </View>
      </View>
    </Page>
  </Document>
);

// 在PDFViewer中渲染PDF
const PDFPage = () => {
  return (
    <PDFViewer style={{ width: '100%', height: '90vh' }}>
      <MyDocument />
    </PDFViewer>
  );
};

export default PDFPage;
