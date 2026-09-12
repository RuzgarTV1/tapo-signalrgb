import QtQuick.Layouts

Item {
    anchors.fill: parent

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 24
        spacing: 14

        Text {
            Layout.fillWidth: true
            text: "Tapo Standalone — Safe Preview"
            color: "white"
            font.pixelSize: 24
            font.bold: true
        }

        Text {
            Layout.fillWidth: true
            text: "This build starts in passive mode. It does not connect, discover, announce, or modify devices until SAFE_START_ENABLED is set to true in TapoStandalone.js."
            color: "#d5dbe3"
            font.pixelSize: 15
            wrapMode: Text.WordWrap
        }

        Text {
            Layout.fillWidth: true
            text: "Read README.md before enabling it. If SignalRGB behaves unexpectedly, remove both TapoStandalone files and restart SignalRGB."
            color: "#ffcc80"
            font.pixelSize: 15
            wrapMode: Text.WordWrap
        }

        Item { Layout.fillHeight: true }
    }
}
