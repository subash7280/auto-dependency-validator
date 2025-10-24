import { runFromCli } from '../src/index.js';

async function run() {
    console.log('🔍 Running Import Checker...\n');

    const result = await runFromCli({
        targetDir: './test',
        extensions: ['.js', '.ts'],
        exclude: ['node_modules'],
    });

    console.log('📊 Import Check Report:\n');
    console.log(JSON.stringify(result, null, 2));

    if (result.summary.filesWithErrors > 0) {
        console.log('\n⚠️ Issues found in imports!');
    } else {
        console.log('\n✅ All imports look good!');
    }
}

run().catch((err) => console.error('❌ Error:', err));
