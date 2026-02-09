import StorageHandler from './src/core/StorageHandler';

async function inspect() {
    const data = await StorageHandler.getData("marks");
    console.log(JSON.stringify(data, null, 2));
}

inspect();
