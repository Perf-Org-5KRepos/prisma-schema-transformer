import camelcase = require('camelcase');
import pluralize = require('pluralize');
import {produce} from 'immer';

import {Model, Field} from '.';
import {DMMF} from '@prisma/generator-helper';

function singularizeModelName(modelName: string) {
	return camelcase(pluralize(modelName, 1), {pascalCase: true});
}

function transformModel(model: Model) {
	const {name} = model;

	const fixModelName = produce(model, draftModel => {
		if (name !== singularizeModelName(name)) {
			draftModel.name = singularizeModelName(name);
			draftModel.dbName = name;
		}
	});

	const fixFieldsName = produce(fixModelName, draftModel => {
    const fields = draftModel.fields as Field[];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
		draftModel.fields = fields.map(field => produce(field, draftField => {
			const {name, kind, type, relationFromFields, relationToFields, isList} = draftField;

      // Transform field name
      draftField.name = isList ? camelcase(name) : camelcase(pluralize(name, 1));

			if (draftField.name !== name) {
				draftField.columnName = name;
			}

			// Posts posts[]
			if (kind === 'object' && type !== singularizeModelName(type)) {
				draftField.type = singularizeModelName(type);
			}

			// Object kind, with @relation attributes
			if (kind === 'object' && relationFromFields && relationFromFields.length > 0 && relationToFields) {
				draftField.relationFromFields = [camelcase(relationFromFields[0])];
				draftField.relationToFields = [camelcase(relationToFields[0])];
      }

      if (name === 'updated_at') {
        draftField.isUpdatedAt = true;
      }
		})) as DMMF.Field[]; // Force type conversion
	});

	return fixFieldsName;
}

export function dmmfModelTransformer(models: Model[]): Model[] {
	return models.map(model => transformModel(model));
}
