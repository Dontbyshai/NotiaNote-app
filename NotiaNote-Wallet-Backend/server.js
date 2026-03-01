const express = require('express');
const { PKPass } = require('passkit-generator');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Configuration
const CERTS_DIR = './certs';
const SIGNER_CERT_PATH = path.join(CERTS_DIR, 'signerCert.pem');
const SIGNER_KEY_PATH = path.join(CERTS_DIR, 'signerKey.pem');
const SIGNER_KEY_PASSPHRASE = '';

app.get('/api/generate-pass', async (req, res) => {
    try {
        const { firstName, lastName, barcodeNumber, className, schoolName, barcodeFormat } = req.query;

        // Supported Apple Wallet formats — map friendly names to PKPass constants
        const SUPPORTED_FORMATS = {
            'qr': 'PKBarcodeFormatQR',
            'code128': 'PKBarcodeFormatCode128',
            'pdf417': 'PKBarcodeFormatPDF417',
            'aztec': 'PKBarcodeFormatAztec',
        };

        // Default to QR if not specified or unknown
        const pkFormat = SUPPORTED_FORMATS[barcodeFormat?.toLowerCase()] || 'PKBarcodeFormatQR';

        console.log(`Generating pass for: ${firstName} ${lastName} (${barcodeNumber}) | Format: ${pkFormat}`);

        const passJson = {
            "formatVersion": 1,
            "passTypeIdentifier": "pass.com.notianote.cantine",
            "teamIdentifier": "4F6WPK4P57",
            "serialNumber": `cantine-${barcodeNumber}-${Date.now()}`,
            "organizationName": " ",
            "description": "Carte Cantine",
            "logoText": " ",
            "foregroundColor": "rgb(255, 255, 255)",
            "backgroundColor": "rgb(15, 23, 42)",
            "labelColor": "rgb(148, 163, 184)",
            "barcodes": [
                {
                    "format": pkFormat,
                    "message": String(barcodeNumber),
                    "messageEncoding": "iso-8859-1",
                    "altText": String(barcodeNumber)
                }
            ],
            "storeCard": {
                "headerFields": [],
                "primaryFields": [
                    {
                        "key": "name",
                        "label": "",
                        "value": `${firstName || ''} ${lastName || ''}`.trim() || 'Élève'
                    }
                ],
                "secondaryFields": [
                    {
                        "key": "class",
                        "label": "CLASSE",
                        "value": className || ""
                    }
                ],
                "auxiliaryFields": [
                    {
                        "key": "school",
                        "label": "ÉTABLISSEMENT",
                        "value": schoolName || ""
                    }
                ],
                "backFields": []
            }
        };

        const pass = new PKPass({
            "pass.json": Buffer.from(JSON.stringify(passJson)),
            "icon.png": fs.readFileSync('./images/icon.png'),
            "icon@2x.png": fs.readFileSync('./images/icon@2x.png'),
            "logo.png": fs.readFileSync('./images/logo.png'),
            "logo@2x.png": fs.readFileSync('./images/logo@2x.png')
        }, {
            "wwdr": fs.readFileSync(path.join(CERTS_DIR, 'wwdr.pem')),
            "signerCert": fs.readFileSync(SIGNER_CERT_PATH),
            "signerKey": fs.readFileSync(SIGNER_KEY_PATH),
            "signerKeyPassphrase": "1234"
        });

        const buffer = pass.getAsBuffer();

        res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
        res.setHeader('Content-Disposition', 'inline; filename="cantine.pkpass"');
        res.send(buffer);

        console.log("PASS GENERATED SUCCESSFULLY");

    } catch (error) {
        console.error("Error generating pass:", error);
        res.status(500).json({ error: "Failed to generate Apple Wallet pass." });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Backend running on port ${port}`);
});
